import { BadRequestException } from '@nestjs/common';
import { ExecutionStatus } from '@prisma/client';
import { PulseExecutionProcessor } from './pulse-execution.processor';
import { PULSE_QUEUES, PulseExecutionJob } from '../queues/pulse-queue.contracts';

function createJob(overrides: Partial<PulseExecutionJob> = {}) {
  return {
    id: 'job-1',
    data: {
      tenantId: 'tenant-1',
      idempotencyKey: 'pulse.execution:tenant-1:exec-1',
      requestedAt: '2026-05-09T12:00:00.000Z',
      executionRequestId: 'exec-1',
      contextPackVersion: 'pulse.context-pack.v1',
      ...overrides,
    },
  };
}

describe('PulseExecutionProcessor', () => {
  const runtimeLifecycle = {
    get: jest.fn(),
    transition: jest.fn(),
  };
  const queues = {
    enqueueFailed: jest.fn(),
    enqueueTimeline: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('dispatches queued execution requests through a no-provider lifecycle stub', async () => {
    runtimeLifecycle.get.mockResolvedValue({
      id: 'exec-1',
      status: ExecutionStatus.QUEUED,
    });
    runtimeLifecycle.transition
      .mockResolvedValueOnce({ id: 'exec-1', status: ExecutionStatus.RUNNING })
      .mockResolvedValueOnce({ id: 'exec-1', status: ExecutionStatus.SUCCEEDED });

    const processor = new PulseExecutionProcessor(
      runtimeLifecycle as never,
      queues as never,
    );

    await processor.process(createJob() as never);

    expect(runtimeLifecycle.get).toHaveBeenCalledWith('tenant-1', 'exec-1');
    expect(runtimeLifecycle.transition).toHaveBeenNthCalledWith(1, {
      tenantId: 'tenant-1',
      executionId: 'exec-1',
      status: ExecutionStatus.RUNNING,
      output: {
        dispatch: {
          providerCalls: false,
          stage: 'runtime_dispatch_prepared',
        },
      },
    });
    expect(runtimeLifecycle.transition).toHaveBeenNthCalledWith(2, {
      tenantId: 'tenant-1',
      executionId: 'exec-1',
      status: ExecutionStatus.SUCCEEDED,
      output: {
        dispatch: {
          prepared: true,
          executable: false,
          reason: 'runtime_provider_not_implemented',
          providerCalls: false,
          contextPackVersion: 'pulse.context-pack.v1',
        },
      },
    });
    expect(queues.enqueueTimeline).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      eventType: 'pulse.runtime.execution_dispatched',
      idempotencyKey: 'pulse.timeline:tenant-1:exec-1:dispatched',
      metadata: expect.objectContaining({
        source: PULSE_QUEUES.EXECUTION,
        contextPackVersion: 'pulse.context-pack.v1',
      }),
    }));
    expect(queues.enqueueTimeline).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      eventType: 'pulse.runtime.execution_dispatch_completed',
      idempotencyKey: 'pulse.timeline:tenant-1:exec-1:dispatch-completed',
      payload: expect.objectContaining({
        executable: false,
        reason: 'runtime_provider_not_implemented',
      }),
    }));
    expect(queues.enqueueFailed).not.toHaveBeenCalled();
  });

  it('skips dispatch when execution is no longer queued', async () => {
    runtimeLifecycle.get.mockResolvedValue({
      id: 'exec-1',
      status: ExecutionStatus.SUCCEEDED,
    });

    const processor = new PulseExecutionProcessor(
      runtimeLifecycle as never,
      queues as never,
    );

    await processor.process(createJob() as never);

    expect(runtimeLifecycle.transition).not.toHaveBeenCalled();
    expect(queues.enqueueTimeline).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'pulse.runtime.execution_dispatch_skipped',
      idempotencyKey: 'pulse.timeline:tenant-1:exec-1:dispatch-skipped',
      payload: expect.objectContaining({
        currentStatus: ExecutionStatus.SUCCEEDED,
        reason: 'execution_not_queued',
      }),
    }));
  });

  it('captures failed execution dispatches and rethrows for BullMQ retry handling', async () => {
    runtimeLifecycle.get.mockRejectedValue(new Error('database unavailable'));
    const processor = new PulseExecutionProcessor(
      runtimeLifecycle as never,
      queues as never,
    );

    await expect(processor.process(createJob() as never)).rejects.toThrow('database unavailable');

    expect(queues.enqueueFailed).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      failedQueue: PULSE_QUEUES.EXECUTION,
      failedJobId: 'job-1',
      reason: 'database unavailable',
    }));
    expect(queues.enqueueTimeline).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      eventType: 'pulse.runtime.execution_dispatch_failed',
      idempotencyKey: 'pulse.timeline:tenant-1:exec-1:dispatch-failed',
    }));
  });

  it('rejects malformed execution jobs before lifecycle changes', async () => {
    const processor = new PulseExecutionProcessor(
      runtimeLifecycle as never,
      queues as never,
    );

    await expect(processor.process(createJob({ executionRequestId: '' }) as never))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(runtimeLifecycle.get).not.toHaveBeenCalled();
    expect(runtimeLifecycle.transition).not.toHaveBeenCalled();
  });
});
