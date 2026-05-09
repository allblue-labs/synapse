import { BadRequestException } from '@nestjs/common';
import { PulseActionsProcessor } from './pulse-actions.processor';
import { PULSE_QUEUES, PulseActionJob } from '../queues/pulse-queue.contracts';

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
    canHandle: jest.fn().mockReturnValue(false),
    execute: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    advanceFlowHandler.canHandle.mockReturnValue(false);
  });

  it('projects allowed actions as prepared no-side-effect timeline events', async () => {
    const processor = new PulseActionsProcessor(queues as never, advanceFlowHandler as never);

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
    const processor = new PulseActionsProcessor(queues as never, advanceFlowHandler as never);

    await processor.process(createJob({
      action: 'ticket.advance_flow',
      idempotencyKey: 'pulse.actions:tenant-1:ticket-1:advance',
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

  it('skips actions outside the allowlist without applying side effects', async () => {
    const processor = new PulseActionsProcessor(queues as never, advanceFlowHandler as never);

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
    const processor = new PulseActionsProcessor(queues as never, advanceFlowHandler as never);

    await expect(processor.process(createJob() as never)).rejects.toThrow('timeline unavailable');

    expect(queues.enqueueFailed).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      failedQueue: PULSE_QUEUES.ACTIONS,
      failedJobId: 'job-1',
      reason: 'timeline unavailable',
      payload: expect.objectContaining({
        action: 'ticket.assign',
        ticketId: 'ticket-1',
      }),
    }));
    expect(queues.enqueueTimeline).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'pulse.action.failed',
      payload: expect.objectContaining({
        reason: 'timeline unavailable',
      }),
    }));
  });

  it('rejects malformed action jobs before enqueueing timeline events', async () => {
    const processor = new PulseActionsProcessor(queues as never, advanceFlowHandler as never);

    await expect(processor.process(createJob({ payload: [] as never }) as never))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(queues.enqueueTimeline).not.toHaveBeenCalled();
    expect(queues.enqueueFailed).not.toHaveBeenCalled();
  });
});
