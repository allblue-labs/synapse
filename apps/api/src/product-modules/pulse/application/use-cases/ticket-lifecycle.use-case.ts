import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { AuditStatus, Prisma, PulseActionExecutionStatus, PulseActorType, PulseTicketStatus } from '@prisma/client';
import { AuditService } from '../../../../common/audit/audit.service';
import { PrismaService } from '../../../../common/prisma/prisma.service';
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
import { PulseActionTelemetryService } from '../services/pulse-action-telemetry.service';
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
    private readonly prisma: PrismaService,
    @Optional()
    private readonly actionTelemetry?: PulseActionTelemetryService,
  ) {}

  assignTicket(
    tenantId: string,
    ticketId: string,
    actor: AuthenticatedUser,
    input: { assignedUserId: string; note?: string },
  ) {
    return this.mutate(tenantId, ticketId, actor, PULSE_EVENT_TYPES.TICKET_ASSIGN, 'assign_ticket', {}, async (ticket) => ({
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
    return this.mutate(tenantId, ticketId, actor, PULSE_EVENT_TYPES.TICKET_RESOLVE, 'resolve_ticket', {}, async (ticket) => {
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
    return this.mutate(tenantId, ticketId, actor, PULSE_EVENT_TYPES.TICKET_REOPEN, 'reopen_ticket', {}, async (ticket) => {
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
    return this.mutate(tenantId, ticketId, actor, PULSE_EVENT_TYPES.TICKET_ESCALATE, 'escalate_ticket', {}, async (ticket) => {
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
    return this.mutate(tenantId, ticketId, actor, PULSE_EVENT_TYPES.TICKET_CANCEL, 'cancel_ticket', {}, async (ticket) => {
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
    return this.mutate(tenantId, ticketId, actor, PULSE_EVENT_TYPES.TICKET_OPERATOR_REVIEW, 'submit_operator_review', {}, async (ticket) => {
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
      actionIdempotencyKey?: string;
    },
  ) {
    return this.mutate(
      tenantId,
      ticketId,
      actor,
      PULSE_EVENT_TYPES.TICKET_FLOW_ADVANCE,
      'advance_flow_state',
      { actionIdempotencyKey: input.actionIdempotencyKey },
      async (ticket) => {
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
              actionIdempotencyKey: input.actionIdempotencyKey,
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
            actionIdempotencyKey: input.actionIdempotencyKey,
          },
        };
      },
    );
  }

  private async mutate(
    tenantId: string,
    ticketId: string,
    actor: AuthenticatedUser,
    eventType: string,
    action: string,
    options: { actionIdempotencyKey?: string },
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
    if (options.actionIdempotencyKey) {
      return this.mutateActionTransaction(
        tenantId,
        ticketId,
        actor,
        eventType,
        action,
        options.actionIdempotencyKey,
        build,
      );
    }

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
      idempotencyKey: this.usageIdempotencyKey(action, updated.id),
      metadata: {
        action,
        eventType,
        previousStatus: ticket.status,
        nextStatus: updated.status,
      },
    });

    return updated;
  }

  private mutateActionTransaction(
    tenantId: string,
    ticketId: string,
    actor: AuthenticatedUser,
    eventType: string,
    action: string,
    actionIdempotencyKey: string,
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
    return this.prisma.withTenantContext(tenantId, async (tx) => {
      const ticket = await tx.pulseTicket.findFirst({
        where: { tenantId, id: ticketId },
        select: this.ticketSelect(),
      });
      if (!ticket) {
        throw new NotFoundException('Pulse ticket not found.');
      }

      const claim = await tx.pulseActionExecution.upsert({
        where: {
          tenantId_idempotencyKey: {
            tenantId,
            idempotencyKey: actionIdempotencyKey,
          },
        },
        create: {
          tenantId,
          action,
          idempotencyKey: actionIdempotencyKey,
          ticketId,
          conversationId: ticket.conversationId,
          metadata: {
            eventType,
            actorUserId: actor.sub,
          },
        },
        update: {
          attempts: { increment: 1 },
        },
        select: {
          status: true,
          attempts: true,
        },
      });

      if (claim.status === PulseActionExecutionStatus.SUCCEEDED) {
        this.actionTelemetry?.record({
          tenantId,
          action,
          idempotencyKey: actionIdempotencyKey,
          ticketId,
          conversationId: ticket.conversationId,
          outcome: 'already_succeeded',
          attempts: claim.attempts,
        });
        return ticket;
      }
      if (claim.status === PulseActionExecutionStatus.STARTED && claim.attempts > 1) {
        this.actionTelemetry?.record({
          tenantId,
          action,
          idempotencyKey: actionIdempotencyKey,
          ticketId,
          conversationId: ticket.conversationId,
          outcome: 'in_progress',
          attempts: claim.attempts,
        });
        throw new ConflictException('Pulse action execution is already in progress.');
      }

      this.actionTelemetry?.record({
        tenantId,
        action,
        idempotencyKey: actionIdempotencyKey,
        ticketId,
        conversationId: ticket.conversationId,
        outcome: 'claimed',
        attempts: claim.attempts,
      });

      if (claim.status === PulseActionExecutionStatus.FAILED) {
        await tx.pulseActionExecution.update({
          where: {
            tenantId_idempotencyKey: {
              tenantId,
              idempotencyKey: actionIdempotencyKey,
            },
          },
          data: {
            status: PulseActionExecutionStatus.STARTED,
            errorMessage: null,
            failedAt: null,
            startedAt: new Date(),
          },
        });
      }

      const update = await build(ticket);
      update.metadata = this.withConsumedActionIdempotencyKey(
        (update.metadata ?? this.metadata(ticket)) as Prisma.InputJsonValue,
        actionIdempotencyKey,
        action,
        eventType,
      );

      const updated = await tx.pulseTicket.update({
        where: { id: ticketId },
        data: {
          status: update.status,
          assignedUserId: update.assignedUserId,
          confidence: update.confidence,
          priority: update.priority,
          metadata: update.metadata,
          resolvedAt: update.resolvedAt,
        },
        select: this.ticketSelect(),
      });

      await tx.pulseOperationalEvent.create({
        data: {
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
            actionIdempotencyKey,
          },
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorUserId: actor.sub,
          action: eventType,
          resourceType: 'PulseTicket',
          resourceId: updated.id,
          status: AuditStatus.SUCCESS,
          metadata: pulseEventPayload(action, {
            previousStatus: ticket.status,
            nextStatus: updated.status,
          }),
        },
      });

      const usageIdempotencyKey = this.usageIdempotencyKey(action, updated.id, actionIdempotencyKey);
      await tx.usageEvent.upsert({
        where: {
          tenantId_idempotencyKey: {
            tenantId,
            idempotencyKey: usageIdempotencyKey,
          },
        },
        create: {
          tenantId,
          moduleSlug: 'pulse',
          metricType: UsageMetricType.WORKFLOW_RUN,
          quantity: 1,
          unit: action === 'advance_flow_state' ? 'flow_transition' : 'ticket_operation',
          resourceType: 'PulseTicket',
          resourceId: updated.id,
          idempotencyKey: usageIdempotencyKey,
          billingPeriod: this.billingPeriodFor(new Date()),
          metadata: {
            action,
            eventType,
            previousStatus: ticket.status,
            nextStatus: updated.status,
            actionIdempotencyKey,
          },
        },
        update: {},
      });

      await tx.pulseActionExecution.update({
        where: {
          tenantId_idempotencyKey: {
            tenantId,
            idempotencyKey: actionIdempotencyKey,
          },
        },
        data: {
          status: PulseActionExecutionStatus.SUCCEEDED,
          completedAt: new Date(),
          errorMessage: null,
          metadata: {
            action,
            eventType,
            ticketId: updated.id,
            previousStatus: ticket.status,
            nextStatus: updated.status,
          },
        },
      });

      this.actionTelemetry?.record({
        tenantId,
        action,
        idempotencyKey: actionIdempotencyKey,
        ticketId: updated.id,
        conversationId: updated.conversationId,
        outcome: 'succeeded',
        attempts: claim.attempts,
      });

      return updated;
    });
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

  private hasConsumedActionIdempotencyKey(ticket: PulseTicketRecord, key: string) {
    return Object.prototype.hasOwnProperty.call(this.actionIdempotencyKeys(this.metadata(ticket)), key);
  }

  private withConsumedActionIdempotencyKey(
    metadata: Prisma.InputJsonValue,
    key: string,
    action: string,
    eventType: string,
  ): Prisma.InputJsonValue {
    const base = this.objectMetadata(metadata);
    return {
      ...base,
      actionIdempotencyKeys: {
        ...this.actionIdempotencyKeys(base),
        [key]: {
          action,
          eventType,
          consumedAt: new Date().toISOString(),
        },
      },
    } as Prisma.InputJsonValue;
  }

  private actionIdempotencyKeys(metadata: TicketMetadata) {
    const keys = metadata.actionIdempotencyKeys;
    if (!keys || typeof keys !== 'object' || Array.isArray(keys)) {
      return {};
    }

    return keys as Record<string, unknown>;
  }

  private objectMetadata(metadata: Prisma.InputJsonValue): TicketMetadata {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {};
    }

    return metadata as TicketMetadata;
  }

  private usageIdempotencyKey(action: string, ticketId: string, actionIdempotencyKey?: string) {
    if (actionIdempotencyKey) {
      return `pulse-ticket-${action}:${ticketId}:${actionIdempotencyKey}`;
    }

    return `pulse-ticket-${action}:${ticketId}`;
  }

  private billingPeriodFor(date: Date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private ticketSelect() {
    return {
      id: true,
      tenantId: true,
      conversationId: true,
      type: true,
      status: true,
      assignedUserId: true,
      confidence: true,
      metadata: true,
      priority: true,
      resolvedAt: true,
    } satisfies Prisma.PulseTicketSelect;
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
