import { IntegrationProvider } from '@prisma/client';
import { PulseQueueService } from './pulse-queue.service';
import { PULSE_QUEUES } from './pulse-queue.contracts';

function queue() {
  return { add: jest.fn() };
}

describe('PulseQueueService', () => {
  it('enqueues inbound work with a stable tenant-scoped idempotency key', async () => {
    const inbound = queue();
    const service = new PulseQueueService(
      inbound as never,
      queue() as never,
      queue() as never,
      queue() as never,
      queue() as never,
      queue() as never,
    );

    await service.enqueueInbound({
      tenantId: 'tenant-1',
      entryId: 'entry-1',
      conversationId: 'conversation-1',
    });

    expect(inbound.add).toHaveBeenCalledWith(
      'pulse.inbound.process',
      expect.objectContaining({
        tenantId: 'tenant-1',
        entryId: 'entry-1',
        conversationId: 'conversation-1',
        idempotencyKey: 'pulse.inbound:tenant-1:entry-1',
        source: 'pulse.entry',
      }),
      expect.objectContaining({
        attempts: 3,
        jobId: 'pulse.inbound:tenant-1:entry-1',
      }),
    );
  });

  it('keeps context, execution, action, timeline, and failed queues isolated', async () => {
    const context = queue();
    const execution = queue();
    const actions = queue();
    const timeline = queue();
    const failed = queue();
    const service = new PulseQueueService(
      queue() as never,
      context as never,
      execution as never,
      actions as never,
      timeline as never,
      failed as never,
    );

    await service.enqueueContext({
      tenantId: 'tenant-1',
      idempotencyKey: 'pulse.context:tenant-1:ticket-1',
      skill: 'SUPPORT',
      executionType: 'classify_intent',
      ticketId: 'ticket-1',
    });
    await service.enqueueExecution({
      tenantId: 'tenant-1',
      idempotencyKey: 'pulse.execution:tenant-1:exec-1',
      executionRequestId: 'exec-1',
      contextPackVersion: 'pulse.context-pack.v1',
    });
    await service.enqueueAction({
      tenantId: 'tenant-1',
      idempotencyKey: 'pulse.actions:tenant-1:ticket-1:assign',
      action: 'ticket.assign',
      ticketId: 'ticket-1',
      payload: { assignedUserId: 'user-1' },
    });
    await service.enqueueTimeline({
      tenantId: 'tenant-1',
      idempotencyKey: 'pulse.timeline:tenant-1:event-1',
      eventId: 'event-1',
      eventType: 'pulse.ticket.assign_ticket',
    });
    await service.enqueueFailed({
      tenantId: 'tenant-1',
      idempotencyKey: 'pulse.failed:tenant-1:job-1',
      failedQueue: PULSE_QUEUES.CONTEXT,
      failedJobId: 'job-1',
      reason: 'validation_failed',
      payload: { provider: IntegrationProvider.GOOGLE_CALENDAR },
    });

    expect(context.add).toHaveBeenCalledWith('pulse.context.assemble', expect.any(Object), expect.any(Object));
    expect(execution.add).toHaveBeenCalledWith('pulse.execution.request', expect.any(Object), expect.any(Object));
    expect(actions.add).toHaveBeenCalledWith('pulse.actions.dispatch', expect.any(Object), expect.any(Object));
    expect(timeline.add).toHaveBeenCalledWith('pulse.timeline.append', expect.any(Object), expect.any(Object));
    expect(failed.add).toHaveBeenCalledWith(
      'pulse.failed.capture',
      expect.any(Object),
      expect.objectContaining({ attempts: 1 }),
    );
  });
});
