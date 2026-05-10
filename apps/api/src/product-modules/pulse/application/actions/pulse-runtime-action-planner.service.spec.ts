import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PulseRuntimeActionPlannerService } from './pulse-runtime-action-planner.service';

describe('PulseRuntimeActionPlannerService', () => {
  const actions = {
    enqueue: jest.fn(),
  };

  const baseInput = {
    tenantId: 'tenant-1',
    executionRequestId: 'exec-1',
    ticketId: 'ticket-1',
    conversationId: 'conversation-1',
    allowedActions: ['ticket.advance_flow'],
    actor: {
      userId: 'user-1',
      email: 'operator@example.com',
      role: 'tenant_operator' as const,
      permissions: ['tickets:write' as const],
    },
    output: {
      decisionSummary: 'Advance the ticket to collect more context.',
      confidence: 0.91,
      nextState: 'collect_context',
      recommendedActions: ['ticket.advance_flow'],
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('validates runtime output and enqueues governed ticket advance actions', async () => {
    actions.enqueue.mockResolvedValue({ id: 'job-1' });
    const service = new PulseRuntimeActionPlannerService(actions as never);

    await expect(service.plan(baseInput)).resolves.toEqual({
      enqueued: [{
        action: 'ticket.advance_flow',
        idempotencyKey: 'pulse.actions:tenant-1:exec-1:ticket.advance_flow:ticket-1',
      }],
      skipped: [],
    });

    expect(actions.enqueue).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      idempotencyKey: 'pulse.actions:tenant-1:exec-1:ticket.advance_flow:ticket-1',
      traceId: undefined,
      action: 'ticket.advance_flow',
      ticketId: 'ticket-1',
      conversationId: 'conversation-1',
      actor: baseInput.actor,
      payload: {
        nextState: 'collect_context',
        transitionSource: 'ai',
        confidence: 0.91,
        note: 'Advance the ticket to collect more context.',
        aiDecisionSummary: {
          decisionSummary: 'Advance the ticket to collect more context.',
          recommendedActions: ['ticket.advance_flow'],
          executionRequestId: 'exec-1',
        },
      },
    });
  });

  it('skips action enqueue when confidence is below threshold', async () => {
    const service = new PulseRuntimeActionPlannerService(actions as never);

    await expect(service.plan({
      ...baseInput,
      output: {
        ...baseInput.output,
        confidence: 0.4,
      },
    })).resolves.toEqual({
      enqueued: [],
      skipped: [{
        action: 'ticket.advance_flow',
        reason: 'confidence_below_action_threshold',
      }],
    });
    expect(actions.enqueue).not.toHaveBeenCalled();
  });

  it('rejects malformed runtime output before enqueueing actions', async () => {
    const service = new PulseRuntimeActionPlannerService(actions as never);

    await expect(service.plan({
      ...baseInput,
      output: {
        confidence: 0.8,
        nextState: 'collect_context',
        recommendedActions: ['ticket.advance_flow'],
      },
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(actions.enqueue).not.toHaveBeenCalled();
  });

  it('propagates governance denials from action enqueue', async () => {
    actions.enqueue.mockRejectedValue(new ForbiddenException('Missing required action permission(s): tickets:write'));
    const service = new PulseRuntimeActionPlannerService(actions as never);

    await expect(service.plan(baseInput)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
