import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PulseActorType, PulseTicketStatus } from '@prisma/client';
import { AuditService } from '../../../../common/audit/audit.service';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user';
import { UsageMeteringService, UsageMetricType } from '../../../../modules/usage/usage-metering.service';
import {
  IPulseOperationalEventRepository,
  PULSE_OPERATIONAL_EVENT_REPOSITORY,
} from '../../domain/ports/pulse-operational-event-repository.port';
import {
  IPulseTicketRepository,
  PulseTicketRecord,
  PULSE_TICKET_REPOSITORY,
} from '../../domain/ports/pulse-ticket-repository.port';
import { PULSE_EVENT_TYPES } from '../../domain/pulse-event-types';
import {
  assertPulseFlowTransition,
  isPulseFlowState,
  PULSE_FLOW_STATES,
  PulseFlowState,
} from '../../domain/pulse-flow-state-machine';
import { evaluatePulseConfidence } from '../../domain/pulse-confidence-policy';
import { pulseEventPayload } from '../services/pulse-event-payload';

type TicketMetadata = Record<string, unknown>;

@Injectable()
export class TicketLifecycleUseCase {
  constructor(
    @Inject(PULSE_TICKET_REPOSITORY)
    private readonly tickets: IPulseTicketRepository,
    @Inject(PULSE_OPERATIONAL_EVENT_REPOSITORY)
    private readonly events: IPulseOperationalEventRepository,
    private readonly audit: AuditService,
    private readonly usage: UsageMeteringService,
  ) {}

  assignTicket(
    tenantId: string,
    ticketId: string,
    actor: AuthenticatedUser,
    input: { assignedUserId: string; note?: string },
  ) {
    return this.mutate(tenantId, ticketId, actor, PULSE_EVENT_TYPES.TICKET_ASSIGN, 'assign_ticket', async (ticket) => ({
      assignedUserId: input.assignedUserId,
      metadata: this.mergeMetadata(ticket, {
        assignment: {
          assignedUserId: input.assignedUserId,
          assignedByUserId: actor.sub,
          assignedAt: new Date().toISOString(),
          note: input.note,
        },
      }),
      eventData: {
        assignedUserId: input.assignedUserId,
        note: input.note,
      },
    }));
  }

  resolveTicket(
    tenantId: string,
    ticketId: string,
    actor: AuthenticatedUser,
    input: { resolutionSummary?: string },
  ) {
    return this.mutate(tenantId, ticketId, actor, PULSE_EVENT_TYPES.TICKET_RESOLVE, 'resolve_ticket', async (ticket) => {
      this.ensureNotTerminal(ticket, 'resolve');
      const resolvedAt = new Date();
      return {
        status: PulseTicketStatus.RESOLVED,
        resolvedAt,
        metadata: this.mergeMetadata(ticket, {
          resolution: {
            summary: input.resolutionSummary,
            resolvedByUserId: actor.sub,
            resolvedAt: resolvedAt.toISOString(),
          },
        }),
        eventData: {
          resolutionSummary: input.resolutionSummary,
          resolvedAt: resolvedAt.toISOString(),
        },
      };
    });
  }

  reopenTicket(
    tenantId: string,
    ticketId: string,
    actor: AuthenticatedUser,
    input: { reason?: string },
  ) {
    return this.mutate(tenantId, ticketId, actor, PULSE_EVENT_TYPES.TICKET_REOPEN, 'reopen_ticket', async (ticket) => {
      if (ticket.status !== PulseTicketStatus.RESOLVED && ticket.status !== PulseTicketStatus.CANCELLED) {
        throw new BadRequestException('Only resolved or cancelled tickets can be reopened.');
      }

      return {
        status: PulseTicketStatus.OPEN,
        resolvedAt: null,
        metadata: this.mergeMetadata(ticket, {
          reopen: {
            reason: input.reason,
            reopenedByUserId: actor.sub,
            reopenedAt: new Date().toISOString(),
          },
        }),
        eventData: { reason: input.reason },
      };
    });
  }

  escalateTicket(
    tenantId: string,
    ticketId: string,
    actor: AuthenticatedUser,
    input: { reason?: string; priority?: number },
  ) {
    return this.mutate(tenantId, ticketId, actor, PULSE_EVENT_TYPES.TICKET_ESCALATE, 'escalate_ticket', async (ticket) => {
      this.ensureNotTerminal(ticket, 'escalate');
      return {
        status: PulseTicketStatus.PENDING_REVIEW,
        priority: input.priority ?? Math.max(ticket.priority, 50),
        metadata: this.mergeMetadata(ticket, {
          escalation: {
            reason: input.reason,
            escalatedByUserId: actor.sub,
            escalatedAt: new Date().toISOString(),
          },
        }),
        eventData: {
          reason: input.reason,
          priority: input.priority ?? Math.max(ticket.priority, 50),
        },
      };
    });
  }

  cancelTicket(
    tenantId: string,
    ticketId: string,
    actor: AuthenticatedUser,
    input: { reason?: string },
  ) {
    return this.mutate(tenantId, ticketId, actor, PULSE_EVENT_TYPES.TICKET_CANCEL, 'cancel_ticket', async (ticket) => {
      this.ensureNotTerminal(ticket, 'cancel');
      return {
        status: PulseTicketStatus.CANCELLED,
        resolvedAt: null,
        metadata: this.mergeMetadata(ticket, {
          cancellation: {
            reason: input.reason,
            cancelledByUserId: actor.sub,
            cancelledAt: new Date().toISOString(),
          },
        }),
        eventData: { reason: input.reason },
      };
    });
  }

  submitOperatorReview(
    tenantId: string,
    ticketId: string,
    actor: AuthenticatedUser,
    input: { summary: string; confidence?: number; decision?: Record<string, unknown> },
  ) {
    return this.mutate(tenantId, ticketId, actor, PULSE_EVENT_TYPES.TICKET_OPERATOR_REVIEW, 'submit_operator_review', async (ticket) => {
      this.ensureNotTerminal(ticket, 'review');
      return {
        status: PulseTicketStatus.OPEN,
        confidence: input.confidence ?? ticket.confidence,
        metadata: this.mergeMetadata(ticket, {
          operatorReview: {
            summary: input.summary,
            confidence: input.confidence,
            decision: input.decision,
            reviewedByUserId: actor.sub,
            reviewedAt: new Date().toISOString(),
          },
        }),
        eventData: {
          summary: input.summary,
          confidence: input.confidence,
          decision: input.decision,
        },
      };
    });
  }

  advanceFlowState(
    tenantId: string,
    ticketId: string,
    actor: AuthenticatedUser,
    input: {
      nextState: string;
      transitionSource?: 'manual' | 'system' | 'ai' | 'integration';
      confidence?: number;
      note?: string;
      aiDecisionSummary?: Record<string, unknown>;
    },
  ) {
    return this.mutate(tenantId, ticketId, actor, PULSE_EVENT_TYPES.TICKET_FLOW_ADVANCE, 'advance_flow_state', async (ticket) => {
      this.ensureNotTerminal(ticket, 'advance flow state');
      const previousState = this.currentFlowState(ticket);
      if (!isPulseFlowState(input.nextState)) {
        throw new BadRequestException(`Unsupported Pulse flow state "${input.nextState}".`);
      }
      const confidenceDecision = evaluatePulseConfidence({
        requestedState: input.nextState,
        confidence: input.confidence,
        transitionSource: input.transitionSource ?? 'manual',
      });
      assertPulseFlowTransition(previousState, confidenceDecision.effectiveState);
      const statusUpdate = this.ticketStatusForFlowState(confidenceDecision.effectiveState);
      return {
        ...statusUpdate,
        confidence: input.confidence ?? ticket.confidence,
        metadata: this.mergeMetadata(ticket, {
          flowState: confidenceDecision.effectiveState,
          flowTransition: {
            previousState,
            requestedState: input.nextState,
            nextState: confidenceDecision.effectiveState,
            source: input.transitionSource ?? 'manual',
            confidence: input.confidence,
            confidenceDecision,
            note: input.note,
            aiDecisionSummary: input.aiDecisionSummary,
            advancedByUserId: actor.sub,
            advancedAt: new Date().toISOString(),
          },
        }),
        eventData: {
          previousState,
          requestedState: input.nextState,
          nextState: confidenceDecision.effectiveState,
          source: input.transitionSource ?? 'manual',
          confidence: input.confidence,
          confidenceDecision,
          note: input.note,
          aiDecisionSummary: input.aiDecisionSummary,
        },
      };
    });
  }

  private async mutate(
    tenantId: string,
    ticketId: string,
    actor: AuthenticatedUser,
    eventType: string,
    action: string,
    build: (ticket: PulseTicketRecord) => Promise<{
      status?: PulseTicketStatus;
      assignedUserId?: string | null;
      confidence?: number | null;
      priority?: number;
      metadata?: Prisma.InputJsonValue;
      resolvedAt?: Date | null;
      eventData?: Record<string, unknown>;
    }>,
  ) {
    const ticket = await this.tickets.findById(tenantId, ticketId);
    if (!ticket) {
      throw new NotFoundException('Pulse ticket not found.');
    }

    const update = await build(ticket);
    const updated = await this.tickets.update(tenantId, ticketId, update);
    if (!updated) {
      throw new NotFoundException('Pulse ticket not found.');
    }

    await this.events.record({
      tenantId,
      eventType,
      actorType: PulseActorType.USER,
      actorUserId: actor.sub,
      conversationId: updated.conversationId ?? undefined,
      ticketId: updated.id,
      payload: pulseEventPayload(action, {
        ticketId: updated.id,
        previousStatus: ticket.status,
        nextStatus: updated.status,
        ...update.eventData,
      }),
      metadata: {
        usageCandidate: 'ticket_operation',
        permissionScope: 'tickets:write',
      },
    });

    await this.audit.record({
      tenantId,
      actorUserId: actor.sub,
      action: eventType,
      resourceType: 'PulseTicket',
      resourceId: updated.id,
      metadata: pulseEventPayload(action, {
        previousStatus: ticket.status,
        nextStatus: updated.status,
      }),
    });

    await this.usage.record({
      tenantId,
      moduleSlug: 'pulse',
      metricType: UsageMetricType.WORKFLOW_RUN,
      quantity: 1,
      unit: action === 'advance_flow_state' ? 'flow_transition' : 'ticket_operation',
      resourceType: 'PulseTicket',
      resourceId: updated.id,
      idempotencyKey: `pulse-ticket-${action}:${updated.id}`,
      metadata: {
        action,
        eventType,
        previousStatus: ticket.status,
        nextStatus: updated.status,
      },
    });

    return updated;
  }

  private ensureNotTerminal(ticket: PulseTicketRecord, action: string) {
    if (ticket.status === PulseTicketStatus.RESOLVED || ticket.status === PulseTicketStatus.CANCELLED) {
      throw new BadRequestException(`Cannot ${action} a terminal ticket.`);
    }
  }

  private mergeMetadata(ticket: PulseTicketRecord, patch: TicketMetadata): Prisma.InputJsonValue {
    return {
      ...this.metadata(ticket),
      ...patch,
    } as Prisma.InputJsonValue;
  }

  private metadata(ticket: PulseTicketRecord): TicketMetadata {
    if (!ticket.metadata || typeof ticket.metadata !== 'object' || Array.isArray(ticket.metadata)) {
      return {};
    }

    return ticket.metadata as TicketMetadata;
  }

  private currentFlowState(ticket: PulseTicketRecord): PulseFlowState | null {
    const state = this.metadata(ticket).flowState;
    return isPulseFlowState(state) ? state : null;
  }

  private ticketStatusForFlowState(nextState: PulseFlowState): {
    status?: PulseTicketStatus;
    resolvedAt?: Date | null;
    priority?: number;
  } {
    if (nextState === PULSE_FLOW_STATES.WAITING_CUSTOMER) {
      return { status: PulseTicketStatus.WAITING_CUSTOMER };
    }

    if (
      nextState === PULSE_FLOW_STATES.REVIEW_REQUIRED ||
      nextState === PULSE_FLOW_STATES.OPERATOR_TAKEOVER
    ) {
      return { status: PulseTicketStatus.PENDING_REVIEW };
    }

    if (nextState === PULSE_FLOW_STATES.ESCALATED) {
      return { status: PulseTicketStatus.PENDING_REVIEW, priority: 75 };
    }

    if (nextState === PULSE_FLOW_STATES.COMPLETED) {
      return { status: PulseTicketStatus.RESOLVED, resolvedAt: new Date() };
    }

    if (nextState === PULSE_FLOW_STATES.CANCELLED) {
      return { status: PulseTicketStatus.CANCELLED, resolvedAt: null };
    }

    return { status: PulseTicketStatus.OPEN };
  }
}
