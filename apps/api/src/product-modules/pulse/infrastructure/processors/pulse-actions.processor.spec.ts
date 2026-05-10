import { BadRequestException } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { PulseActionsProcessor } from './pulse-actions.processor';
import { PULSE_QUEUES, PulseActionJob } from '../queues/pulse-queue.contracts';
import { PulseActionPayloadValidationException } from '../../application/actions/pulse-ticket-advance-flow-action.handler';

function createJob(overrides: Partial<PulseActionJob> = {}) {
  return {
    id: 'job-1',
    data: {
      tenantId: 'tenant-1',
      idempotencyKey: 'pulse.actions:tenant-1:ticket-1:assign',
      requestedAt: '2026-05-09T12:00:00.000Z',
      action: 'ticket.assign',
      ticketId: 'ticket-1',
      payload: { assignedUserId: 'user-1' },
      ...overrides,
    },
  };
}

describe('PulseActionsProcessor', () => {
  const queues = {
    enqueueTimeline: jest.fn(),
    enqueueFailed: jest.fn(),
  };
  const advanceFlowHandler = {
    definition: {
      action: 'ticket.advance_flow',
      permissions: ['tickets:write'],
      validationFailureClass: 'non_retryable_validation',
    },
    canHandle: jest.fn().mockReturnValue(false),
    execute: jest.fn(),
  };
  const registry = {
    find: jest.fn(),
    definition: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    advanceFlowHandler.canHandle.mockReturnValue(false);
    registry.find.mockImplementation((action) => (
      advanceFlowHandler.canHandle(action) ? advanceFlowHandler : null
    ));
    registry.definition.mockImplementation((action) => (
      advanceFlowHandler.canHandle(action) ? advanceFlowHandler.definition : null
    ));
  });

  it('projects allowed actions as prepared no-side-effect timeline events', async () => {
    const processor = new PulseActionsProcessor(queues as never, registry as never);

    await processor.process(createJob() as never);

    expect(queues.enqueueTimeline).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      idempotencyKey: 'pulse.timeline:tenant-1:pulse.actions:tenant-1:ticket-1:assign:action-dispatched',
      eventType: 'pulse.action.dispatched',
      ticketId: 'ticket-1',
      payload: {
        action: 'ticket.assign',
        payload: { assignedUserId: 'user-1' },
      },
      metadata: expect.objectContaining({
        source: PULSE_QUEUES.ACTIONS,
      }),
    }));
    expect(queues.enqueueTimeline).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      idempotencyKey: 'pulse.timeline:tenant-1:pulse.actions:tenant-1:ticket-1:assign:action-completed',
      eventType: 'pulse.action.completed',
      payload: expect.objectContaining({
        action: 'ticket.assign',
        prepared: true,
        executable: false,
        reason: 'action_handler_not_implemented',
      }),
      metadata: expect.objectContaining({
        sideEffectsApplied: false,
      }),
    }));
    expect(queues.enqueueFailed).not.toHaveBeenCalled();
  });

  it('executes typed handlers for supported real actions', async () => {
    advanceFlowHandler.canHandle.mockImplementation((action) => action === 'ticket.advance_flow');
    advanceFlowHandler.execute.mockResolvedValue({
      sideEffectsApplied: true,
      result: { ticketId: 'ticket-1', status: 'OPEN' },
    });
    const processor = new PulseActionsProcessor(queues as never, registry as never);

    await processor.process(createJob({
      action: 'ticket.advance_flow',
      idempotencyKey: 'pulse.actions:tenant-1:ticket-1:advance',
      actor: {
        userId: 'user-1',
        email: 'operator@example.com',
        role: 'tenant_operator',
        permissions: ['tickets:write'],
      },
      payload: {
        actor: {
          userId: 'user-1',
          email: 'operator@example.com',
          role: 'tenant_operator',
        },
        nextState: 'collect_context',
      },
    }) as never);

    expect(advanceFlowHandler.execute).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      action: 'ticket.advance_flow',
    }));
    expect(queues.enqueueTimeline).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'pulse.action.completed',
      payload: expect.objectContaining({
        action: 'ticket.advance_flow',
        executable: true,
        sideEffectsApplied: true,
        result: { ticketId: 'ticket-1', status: 'OPEN' },
      }),
      metadata: expect.objectContaining({
        sideEffectsApplied: true,
      }),
    }));
  });

  it('rejects real handlers when the queued actor snapshot lacks required permissions', async () => {
    advanceFlowHandler.canHandle.mockImplementation((action) => action === 'ticket.advance_flow');
    const processor = new PulseActionsProcessor(queues as never, registry as never);

    await expect(processor.process(createJob({
      action: 'ticket.advance_flow',
      idempotencyKey: 'pulse.actions:tenant-1:ticket-1:advance',
      actor: {
        userId: 'user-1',
        email: 'viewer@example.com',
        role: 'tenant_viewer',
        permissions: ['tickets:read'],
      },
      payload: {
        actor: {
          userId: 'user-1',
          email: 'viewer@example.com',
          role: 'tenant_viewer',
        },
        nextState: 'collect_context',
      },
    }) as never)).rejects.toBeInstanceOf(UnrecoverableError);

    expect(advanceFlowHandler.execute).not.toHaveBeenCalled();
    expect(queues.enqueueFailed).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      failedQueue: PULSE_QUEUES.ACTIONS,
      reason: 'Missing required action permission(s): tickets:write',
      payload: expect.objectContaining({
        failureClass: 'non_retryable_governance',
        retryable: false,
      }),
    }));
    expect(queues.enqueueTimeline).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'pulse.action.failed',
      payload: expect.objectContaining({
        action: 'ticket.advance_flow',
        reason: 'Missing required action permission(s): tickets:write',
        failureClass: 'non_retryable_governance',
        retryable: false,
      }),
    }));
  });

  it('classifies invalid real action payloads as non-retryable validation failures', async () => {
    advanceFlowHandler.canHandle.mockImplementation((action) => action === 'ticket.advance_flow');
    advanceFlowHandler.execute.mockRejectedValue(
      new PulseActionPayloadValidationException('ticket.advance_flow requires supported nextState.'),
    );
    const processor = new PulseActionsProcessor(queues as never, registry as never);

    await expect(processor.process(createJob({
      action: 'ticket.advance_flow',
      idempotencyKey: 'pulse.actions:tenant-1:ticket-1:advance',
      actor: {
        userId: 'user-1',
        email: 'operator@example.com',
        role: 'tenant_operator',
        permissions: ['tickets:write'],
      },
      payload: {
        actor: {
          userId: 'user-1',
          email: 'operator@example.com',
          role: 'tenant_operator',
        },
        nextState: 'not_a_real_state',
      },
    }) as never)).rejects.toBeInstanceOf(UnrecoverableError);

    expect(queues.enqueueFailed).toHaveBeenCalledWith(expect.objectContaining({
      reason: 'ticket.advance_flow requires supported nextState.',
      payload: expect.objectContaining({
        failureClass: 'non_retryable_validation',
        retryable: false,
      }),
    }));
    expect(queues.enqueueTimeline).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'pulse.action.failed',
      payload: expect.objectContaining({
        failureClass: 'non_retryable_validation',
        retryable: false,
      }),
    }));
  });

  it('skips actions outside the allowlist without applying side effects', async () => {
    const processor = new PulseActionsProcessor(queues as never, registry as never);

    await processor.process(createJob({
      action: 'provider.delete_all_data',
      idempotencyKey: 'pulse.actions:tenant-1:unsafe',
      payload: {},
    }) as never);

    expect(queues.enqueueTimeline).toHaveBeenCalledTimes(1);
    expect(queues.enqueueTimeline).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'pulse.action.skipped',
      payload: {
        action: 'provider.delete_all_data',
        reason: 'action_not_allowed',
      },
    }));
    expect(queues.enqueueFailed).not.toHaveBeenCalled();
  });

  it('captures action dispatch failures', async () => {
    queues.enqueueTimeline.mockRejectedValueOnce(new Error('timeline unavailable'));
    const processor = new PulseActionsProcessor(queues as never, registry as never);

    await expect(processor.process(createJob() as never)).rejects.toThrow('timeline unavailable');

    expect(queues.enqueueFailed).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      failedQueue: PULSE_QUEUES.ACTIONS,
      failedJobId: 'job-1',
      reason: 'timeline unavailable',
      payload: expect.objectContaining({
        action: 'ticket.assign',
        ticketId: 'ticket-1',
        failureClass: 'retryable',
        retryable: true,
      }),
    }));
    expect(queues.enqueueTimeline).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'pulse.action.failed',
      payload: expect.objectContaining({
        reason: 'timeline unavailable',
        failureClass: 'retryable',
        retryable: true,
      }),
    }));
  });

  it('rejects malformed action jobs before enqueueing timeline events', async () => {
    const processor = new PulseActionsProcessor(queues as never, registry as never);

    await expect(processor.process(createJob({ payload: [] as never }) as never))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(queues.enqueueTimeline).not.toHaveBeenCalled();
    expect(queues.enqueueFailed).not.toHaveBeenCalled();
  });
});
