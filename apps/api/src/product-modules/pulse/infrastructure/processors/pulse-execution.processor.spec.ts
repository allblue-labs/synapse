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
  };
  const runtimeDispatcher = {
    dispatchQueued: jest.fn(),
  };
  const ingestRuntimeResult = {
    execute: jest.fn(),
  };
  const queues = {
    enqueueFailed: jest.fn(),
    enqueueTimeline: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('dispatches queued execution requests through the signed Go runtime handoff', async () => {
    runtimeLifecycle.get.mockResolvedValue({
      id: 'exec-1',
      status: ExecutionStatus.QUEUED,
    });
    runtimeDispatcher.dispatchQueued.mockResolvedValue({
      transport: 'http',
      request: {
        id: 'exec-1',
        context: {
          tenantId: 'tenant-1',
          moduleSlug: 'pulse',
          metadata: {
            actorSnapshot: {
              userId: 'user-1',
              email: 'operator@synapse.test',
              role: 'tenant_operator',
              permissions: ['tickets:write'],
            },
          },
        },
        requestType: 'pulse.advance_flow',
        idempotencyKey: 'pulse.context:tenant-1:ticket-1',
        input: {
          contextPack: {
            version: 'pulse.context-pack.v1',
            tenantId: 'tenant-1',
            workspaceId: 'tenant-1',
            module: 'pulse',
            skill: 'SUPPORT',
            executionType: 'advance_flow',
            conversationState: null,
            ticketState: { id: 'ticket-1' },
            playbookState: null,
            knowledgeSnippets: [],
            productsOrServices: [],
            campaignContext: [],
            schedulingContext: {},
            allowedActions: ['ticket.advance_flow'],
            requiredOutputSchema: {
              type: 'object',
              properties: { decisionSummary: { type: 'string' } },
            },
            securityHints: [],
            usageHints: {},
            assembledAt: '2026-05-09T12:00:00.000Z',
          },
        },
        requestedAt: '2026-05-09T12:00:00.000Z',
      },
      response: {
        id: 'runtime-exec-1',
        tenantId: 'tenant-1',
        moduleSlug: 'pulse',
        status: ExecutionStatus.SUCCEEDED,
        output: {
          provider: 'openai',
          model: 'gpt-4.1-mini',
          structuredPayload: {
            decisionSummary: 'Advance safely.',
            confidence: 0.9,
            nextState: 'collect_context',
            recommendedActions: [],
          },
        },
      },
    });
    ingestRuntimeResult.execute.mockResolvedValue({
      execution: { id: 'exec-1', status: ExecutionStatus.SUCCEEDED },
      actionPlan: { enqueued: [], skipped: [] },
    });

    const processor = new PulseExecutionProcessor(
      runtimeLifecycle as never,
      runtimeDispatcher as never,
      ingestRuntimeResult as never,
      queues as never,
    );

    await processor.process(createJob() as never);

    expect(runtimeLifecycle.get).toHaveBeenCalledWith('tenant-1', 'exec-1');
    expect(runtimeDispatcher.dispatchQueued).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      executionId: 'exec-1',
    });
    expect(ingestRuntimeResult.execute).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      status: ExecutionStatus.SUCCEEDED,
      output: {
        decisionSummary: 'Advance safely.',
        confidence: 0.9,
        nextState: 'collect_context',
        recommendedActions: [],
      },
      errorMessage: undefined,
      traceId: undefined,
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
        status: ExecutionStatus.SUCCEEDED,
        providerCalls: true,
        actionPlanning: 'ingested',
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
      runtimeDispatcher as never,
      ingestRuntimeResult as never,
      queues as never,
    );

    await processor.process(createJob() as never);

    expect(runtimeDispatcher.dispatchQueued).not.toHaveBeenCalled();
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
      runtimeDispatcher as never,
      ingestRuntimeResult as never,
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
      runtimeDispatcher as never,
      ingestRuntimeResult as never,
      queues as never,
    );

    await expect(processor.process(createJob({ executionRequestId: '' }) as never))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(runtimeLifecycle.get).not.toHaveBeenCalled();
    expect(runtimeDispatcher.dispatchQueued).not.toHaveBeenCalled();
  });
});
