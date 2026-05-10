import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthRole, Permission } from '@synapse/contracts';
import { isPulseFlowState } from '../../domain/pulse-flow-state-machine';
import { PulseActionGovernanceService } from './pulse-action-governance.service';

export interface PulseRuntimeActionPlannerInput {
  tenantId: string;
  executionRequestId: string;
  ticketId?: string;
  conversationId?: string;
  allowedActions: string[];
  output: Record<string, unknown>;
  actor: {
    userId: string;
    email: string;
    role: AuthRole;
    permissions: Permission[];
  };
  traceId?: string;
}

export interface PulseRuntimeActionPlannerResult {
  enqueued: Array<{
    action: string;
    idempotencyKey: string;
  }>;
  skipped: Array<{
    action: string;
    reason: string;
  }>;
}

@Injectable()
export class PulseRuntimeActionPlannerService {
  constructor(private readonly actions: PulseActionGovernanceService) {}

  async plan(input: PulseRuntimeActionPlannerInput): Promise<PulseRuntimeActionPlannerResult> {
    const output = this.validateOutput(input.output);
    const result: PulseRuntimeActionPlannerResult = {
      enqueued: [],
      skipped: [],
    };

    if (!output.recommendedActions.includes('ticket.advance_flow')) {
      result.skipped.push({ action: 'ticket.advance_flow', reason: 'not_recommended' });
      return result;
    }
    if (!input.allowedActions.includes('ticket.advance_flow')) {
      result.skipped.push({ action: 'ticket.advance_flow', reason: 'not_allowed_by_context' });
      return result;
    }
    if (!input.ticketId) {
      result.skipped.push({ action: 'ticket.advance_flow', reason: 'missing_ticket_id' });
      return result;
    }
    if (!isPulseFlowState(output.nextState)) {
      result.skipped.push({ action: 'ticket.advance_flow', reason: 'unsupported_next_state' });
      return result;
    }
    if (output.confidence < 0.7) {
      result.skipped.push({ action: 'ticket.advance_flow', reason: 'confidence_below_action_threshold' });
      return result;
    }

    const idempotencyKey = `pulse.actions:${input.tenantId}:${input.executionRequestId}:ticket.advance_flow:${input.ticketId}`;
    await this.actions.enqueue({
      tenantId: input.tenantId,
      idempotencyKey,
      traceId: input.traceId,
      action: 'ticket.advance_flow',
      ticketId: input.ticketId,
      conversationId: input.conversationId,
      actor: input.actor,
      payload: {
        nextState: output.nextState,
        transitionSource: 'ai',
        confidence: output.confidence,
        note: output.decisionSummary,
        aiDecisionSummary: {
          decisionSummary: output.decisionSummary,
          recommendedActions: output.recommendedActions,
          executionRequestId: input.executionRequestId,
        },
      },
    });

    result.enqueued.push({ action: 'ticket.advance_flow', idempotencyKey });
    return result;
  }

  private validateOutput(output: Record<string, unknown>) {
    const decisionSummary = output.decisionSummary;
    const confidence = output.confidence;
    const nextState = output.nextState;
    const recommendedActions = output.recommendedActions;

    if (typeof decisionSummary !== 'string' || decisionSummary.length === 0) {
      throw new BadRequestException('Runtime output requires decisionSummary.');
    }
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
      throw new BadRequestException('Runtime output requires confidence between 0 and 1.');
    }
    if (typeof nextState !== 'string') {
      throw new BadRequestException('Runtime output requires nextState.');
    }
    if (!Array.isArray(recommendedActions) || !recommendedActions.every((item) => typeof item === 'string')) {
      throw new BadRequestException('Runtime output requires string recommendedActions.');
    }

    return {
      decisionSummary,
      confidence,
      nextState,
      recommendedActions,
    };
  }
}
