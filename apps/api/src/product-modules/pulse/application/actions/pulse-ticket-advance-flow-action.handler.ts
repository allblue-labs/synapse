import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthRole } from '@synapse/contracts';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user';
import { PulseActionHandler, PulseActionHandlerResult } from '../../domain/ports/pulse-action-handler.port';
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

@Injectable()
export class PulseTicketAdvanceFlowActionHandler implements PulseActionHandler {
  constructor(private readonly tickets: TicketLifecycleUseCase) {}

  canHandle(action: string): boolean {
    return action === 'ticket.advance_flow';
  }

  async execute(job: PulseActionJob): Promise<PulseActionHandlerResult> {
    const payload = this.payload(job.payload);
    const ticketId = job.ticketId ?? this.stringValue(job.payload, 'ticketId');
    if (!ticketId) {
      throw new BadRequestException('ticket.advance_flow requires ticketId.');
    }
    if (!payload.nextState || !isPulseFlowState(payload.nextState)) {
      throw new BadRequestException('ticket.advance_flow requires supported nextState.');
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

  private payload(payload: Record<string, unknown>): AdvanceFlowPayload {
    return payload as AdvanceFlowPayload;
  }

  private actor(payload: AdvanceFlowPayload): AuthenticatedUser {
    if (!payload.actor?.userId || !payload.actor.email || !payload.actor.role) {
      throw new BadRequestException('ticket.advance_flow requires actor metadata.');
    }

    return {
      sub: payload.actor.userId,
      email: payload.actor.email,
      role: payload.actor.role,
    };
  }

  private stringValue(payload: Record<string, unknown>, key: string) {
    const value = payload[key];
    return typeof value === 'string' ? value : undefined;
  }
}
