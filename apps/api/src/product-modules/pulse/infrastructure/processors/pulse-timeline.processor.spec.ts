import { BadRequestException } from '@nestjs/common';
import { PulseActorType } from '@prisma/client';
import { PulseTimelineProcessor } from './pulse-timeline.processor';
import { PULSE_QUEUES, PulseTimelineJob } from '../queues/pulse-queue.contracts';

function createJob(overrides: Partial<PulseTimelineJob> = {}) {
  return {
    id: 'job-1',
    data: {
      tenantId: 'tenant-1',
      idempotencyKey: 'pulse.timeline:tenant-1:event-1',
      requestedAt: '2026-05-09T12:00:00.000Z',
      eventType: 'pulse.runtime.execution_dispatched',
      actorType: 'SYSTEM' as const,
      ticketId: 'ticket-1',
      payload: { executionRequestId: 'exec-1' },
      metadata: { source: PULSE_QUEUES.EXECUTION },
      ...overrides,
    },
  };
}

describe('PulseTimelineProcessor', () => {
  const events = {
    record: jest.fn(),
  };
  const queues = {
    enqueueFailed: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('records audit-safe timeline jobs as operational events', async () => {
    const processor = new PulseTimelineProcessor(events as never, queues as never);

    await processor.process(createJob() as never);

    expect(events.record).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      eventType: 'pulse.runtime.execution_dispatched',
      actorType: PulseActorType.SYSTEM,
      actorUserId: undefined,
      channelId: undefined,
      conversationId: undefined,
      ticketId: 'ticket-1',
      payload: { executionRequestId: 'exec-1' },
      metadata: {
        source: PULSE_QUEUES.EXECUTION,
        sourceQueue: PULSE_QUEUES.TIMELINE,
        idempotencyKey: 'pulse.timeline:tenant-1:event-1',
        traceId: undefined,
      },
      occurredAt: undefined,
    });
    expect(queues.enqueueFailed).not.toHaveBeenCalled();
  });

  it('captures failed timeline projection jobs', async () => {
    events.record.mockRejectedValue(new Error('database unavailable'));
    const processor = new PulseTimelineProcessor(events as never, queues as never);

    await expect(processor.process(createJob() as never)).rejects.toThrow('database unavailable');

    expect(queues.enqueueFailed).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      failedQueue: PULSE_QUEUES.TIMELINE,
      failedJobId: 'job-1',
      reason: 'database unavailable',
      payload: expect.objectContaining({
        eventType: 'pulse.runtime.execution_dispatched',
        ticketId: 'ticket-1',
      }),
    }));
  });

  it('rejects malformed timeline jobs before writing events', async () => {
    const processor = new PulseTimelineProcessor(events as never, queues as never);

    await expect(processor.process(createJob({ eventType: '' }) as never))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(events.record).not.toHaveBeenCalled();
    expect(queues.enqueueFailed).not.toHaveBeenCalled();
  });
});
