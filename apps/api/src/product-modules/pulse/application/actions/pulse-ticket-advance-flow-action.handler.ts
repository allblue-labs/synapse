import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthRole } from '@synapse/contracts';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user';
import {
  PulseActionDefinition,
  PulseActionHandler,
  PulseActionHandlerResult,
} from '../../domain/ports/pulse-action-handler.port';
import { isPulseFlowState } from '../../domain/pulse-flow-state-machine';
import { PulseActionJob } from '../../infrastructure/queues/pulse-queue.contracts';
import { TicketLifecycleUseCase } from '../use-cases/ticket-lifecycle.use-case';

type AdvanceFlowPayload = {
  actor?: {
    userId?: string;
    email?: string;
    role?: AuthRole;
  };
  nextState?: string;
  transitionSource?: 'manual' | 'system' | 'ai' | 'integration';
  confidence?: number;
  note?: string;
  aiDecisionSummary?: Record<string, unknown>;
};

type ValidatedAdvanceFlowPayload = AdvanceFlowPayload & {
  nextState: string;
};

export class PulseActionPayloadValidationException extends BadRequestException {}

@Injectable()
export class PulseTicketAdvanceFlowActionHandler implements PulseActionHandler {
  readonly action = 'ticket.advance_flow';
  readonly definition: PulseActionDefinition = {
    action: this.action,
    permissions: ['tickets:write'],
    validationFailureClass: 'non_retryable_validation',
    usageCandidate: 'workflow_run',
  };

  constructor(private readonly tickets: TicketLifecycleUseCase) {}

  canHandle(action: string): boolean {
    return action === this.action;
  }

  async execute(job: PulseActionJob): Promise<PulseActionHandlerResult> {
    const payload = this.payload(job.payload);
    const ticketId = job.ticketId ?? this.stringValue(job.payload, 'ticketId');
    if (!ticketId) {
      throw new PulseActionPayloadValidationException('ticket.advance_flow requires ticketId.');
    }

    const actor = this.actor(payload);
    const updated = await this.tickets.advanceFlowState(
      job.tenantId,
      ticketId,
      actor,
      {
        nextState: payload.nextState,
        transitionSource: payload.transitionSource ?? 'system',
        confidence: payload.confidence,
        note: payload.note,
        aiDecisionSummary: payload.aiDecisionSummary,
      },
    );

    return {
      sideEffectsApplied: true,
      result: {
        ticketId: updated.id,
        status: updated.status,
        confidence: updated.confidence,
        priority: updated.priority,
      },
    };
  }

  private payload(payload: Record<string, unknown>): ValidatedAdvanceFlowPayload {
    this.assertKnownKeys(payload, [
      'actor',
      'aiDecisionSummary',
      'confidence',
      'nextState',
      'note',
      'ticketId',
      'transitionSource',
    ]);

    if (typeof payload.nextState !== 'string' || !isPulseFlowState(payload.nextState)) {
      throw new PulseActionPayloadValidationException('ticket.advance_flow requires supported nextState.');
    }
    if (
      payload.transitionSource !== undefined &&
      !['manual', 'system', 'ai', 'integration'].includes(String(payload.transitionSource))
    ) {
      throw new PulseActionPayloadValidationException('ticket.advance_flow transitionSource is invalid.');
    }
    if (
      payload.confidence !== undefined &&
      (typeof payload.confidence !== 'number' || payload.confidence < 0 || payload.confidence > 1)
    ) {
      throw new PulseActionPayloadValidationException('ticket.advance_flow confidence must be between 0 and 1.');
    }
    if (payload.note !== undefined && typeof payload.note !== 'string') {
      throw new PulseActionPayloadValidationException('ticket.advance_flow note must be a string.');
    }
    if (
      payload.aiDecisionSummary !== undefined &&
      (!payload.aiDecisionSummary || typeof payload.aiDecisionSummary !== 'object' || Array.isArray(payload.aiDecisionSummary))
    ) {
      throw new PulseActionPayloadValidationException('ticket.advance_flow aiDecisionSummary must be an object.');
    }
    if (payload.ticketId !== undefined && typeof payload.ticketId !== 'string') {
      throw new PulseActionPayloadValidationException('ticket.advance_flow ticketId must be a string.');
    }

    return payload as ValidatedAdvanceFlowPayload;
  }

  private actor(payload: AdvanceFlowPayload): AuthenticatedUser {
    if (!payload.actor || typeof payload.actor !== 'object' || Array.isArray(payload.actor)) {
      throw new PulseActionPayloadValidationException('ticket.advance_flow requires actor metadata.');
    }
    this.assertKnownKeys(payload.actor as Record<string, unknown>, ['email', 'role', 'userId']);
    if (
      typeof payload.actor.userId !== 'string' ||
      typeof payload.actor.email !== 'string' ||
      typeof payload.actor.role !== 'string'
    ) {
      throw new PulseActionPayloadValidationException('ticket.advance_flow requires actor metadata.');
    }

    return {
      sub: payload.actor.userId,
      email: payload.actor.email,
      role: payload.actor.role as AuthRole,
    };
  }

  private stringValue(payload: Record<string, unknown>, key: string) {
    const value = payload[key];
    return typeof value === 'string' ? value : undefined;
  }

  private assertKnownKeys(payload: Record<string, unknown>, allowed: string[]) {
    const unexpected = Object.keys(payload).filter((key) => !allowed.includes(key));
    if (unexpected.length > 0) {
      throw new PulseActionPayloadValidationException(
        `ticket.advance_flow payload contains unsupported field(s): ${unexpected.join(', ')}`,
      );
    }
  }
}
