import { BadRequestException } from '@nestjs/common';
import { PulseContextProcessor } from './pulse-context.processor';
import { PULSE_QUEUES, PulseContextJob } from '../queues/pulse-queue.contracts';

function createJob(overrides: Partial<PulseContextJob> = {}) {
  return {
    id: 'job-1',
    data: {
      tenantId: 'tenant-1',
      idempotencyKey: 'pulse.context:tenant-1:ticket-1',
      requestedAt: '2026-05-09T12:00:00.000Z',
      skill: 'SUPPORT',
      executionType: 'classify_intent',
      conversationId: 'conversation-1',
      ticketId: 'ticket-1',
      ...overrides,
    },
  };
}

describe('PulseContextProcessor', () => {
  const assembler = {
    execute: jest.fn(),
  };
  const runtimeLifecycle = {
    request: jest.fn(),
  };
  const runtimeGovernance = {
    approveAndQueue: jest.fn(),
  };
  const queues = {
    enqueueFailed: jest.fn(),
    enqueueExecution: jest.fn(),
  };
  const events = {
    record: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('assembles context and persists a governed execution request without provider calls', async () => {
    assembler.execute.mockResolvedValue({
      version: 'pulse.context-pack.v1',
      tenantId: 'tenant-1',
      workspaceId: 'tenant-1',
      module: 'pulse',
      skill: 'SUPPORT',
      executionType: 'classify_intent',
      conversationState: null,
      ticketState: null,
      playbookState: null,
      knowledgeSnippets: [],
      productsOrServices: [],
      campaignContext: [],
      schedulingContext: { providers: [] },
      allowedActions: [],
      requiredOutputSchema: {},
      securityHints: [],
      usageHints: {},
      assembledAt: '2026-05-09T12:00:01.000Z',
    });
    runtimeLifecycle.request.mockResolvedValue({
      id: 'exec-1',
      requestType: 'pulse.classify_intent',
    });
    runtimeGovernance.approveAndQueue.mockResolvedValue({
      id: 'exec-1',
      status: 'QUEUED',
    });

    const processor = new PulseContextProcessor(
      assembler as never,
      runtimeLifecycle as never,
      runtimeGovernance as never,
      queues as never,
      events as never,
    );

    await processor.process(createJob() as never);

    expect(assembler.execute).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      skill: 'SUPPORT',
      executionType: 'classify_intent',
      conversationId: 'conversation-1',
      ticketId: 'ticket-1',
      playbookKey: undefined,
      knowledgeLimit: undefined,
    });
    expect(runtimeLifecycle.request).toHaveBeenCalledWith({
      context: {
        tenantId: 'tenant-1',
        moduleSlug: 'pulse',
        requestId: undefined,
        metadata: {
          sourceQueue: PULSE_QUEUES.CONTEXT,
          skill: 'SUPPORT',
          executionType: 'classify_intent',
          contextPackVersion: 'pulse.context-pack.v1',
        },
      },
      requestType: 'pulse.classify_intent',
      idempotencyKey: 'pulse.context:tenant-1:ticket-1',
      input: {
        contextPack: expect.objectContaining({
          module: 'pulse',
          version: 'pulse.context-pack.v1',
        }),
      },
    });
    expect(events.record).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      eventType: 'pulse.context.assembled',
      ticketId: 'ticket-1',
    }));
    expect(events.record).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      eventType: 'pulse.runtime.execution_requested',
      payload: expect.objectContaining({
        executionRequestId: 'exec-1',
        status: 'REQUESTED',
      }),
      metadata: expect.objectContaining({
        runtimeProviderCalls: false,
      }),
    }));
    expect(runtimeGovernance.approveAndQueue).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      executionId: 'exec-1',
      moduleSlug: 'pulse',
      requestType: 'pulse.classify_intent',
    });
    expect(queues.enqueueExecution).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      idempotencyKey: 'pulse.execution:tenant-1:exec-1',
      traceId: undefined,
      executionRequestId: 'exec-1',
      contextPackVersion: 'pulse.context-pack.v1',
      source: PULSE_QUEUES.CONTEXT,
    });
    expect(queues.enqueueFailed).not.toHaveBeenCalled();
  });

  it('captures failed context jobs and rethrows for BullMQ retry handling', async () => {
    assembler.execute.mockRejectedValue(new Error('context missing'));
    const processor = new PulseContextProcessor(
      assembler as never,
      runtimeLifecycle as never,
      runtimeGovernance as never,
      queues as never,
      events as never,
    );

    await expect(processor.process(createJob() as never)).rejects.toThrow('context missing');

    expect(queues.enqueueFailed).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      failedQueue: PULSE_QUEUES.CONTEXT,
      failedJobId: 'job-1',
      reason: 'context missing',
    }));
    expect(events.record).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      eventType: 'pulse.context.assembly_failed',
    }));
  });

  it('rejects malformed context jobs before persistence', async () => {
    const processor = new PulseContextProcessor(
      assembler as never,
      runtimeLifecycle as never,
      runtimeGovernance as never,
      queues as never,
      events as never,
    );

    await expect(processor.process(createJob({ tenantId: '' }) as never))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(assembler.execute).not.toHaveBeenCalled();
    expect(runtimeLifecycle.request).not.toHaveBeenCalled();
    expect(runtimeGovernance.approveAndQueue).not.toHaveBeenCalled();
  });
});
