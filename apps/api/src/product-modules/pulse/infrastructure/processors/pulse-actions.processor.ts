import { BadRequestException, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PulseTicketAdvanceFlowActionHandler } from '../../application/actions/pulse-ticket-advance-flow-action.handler';
import { PULSE_EVENT_TYPES } from '../../domain/pulse-event-types';
import {
  PULSE_QUEUES,
  PulseActionJob,
} from '../queues/pulse-queue.contracts';
import { PulseQueueService } from '../queues/pulse-queue.service';

const ALLOWED_ACTIONS = new Set([
  'execution.request',
  'operator.review.request',
  'schedule.check_availability',
  'ticket.advance_flow',
  'ticket.assign',
  'ticket.cancel',
  'ticket.escalate',
  'ticket.resolve',
  'timeline.append',
]);

@Processor(PULSE_QUEUES.ACTIONS)
export class PulseActionsProcessor extends WorkerHost {
  private readonly logger = new Logger(PulseActionsProcessor.name);

  constructor(
    private readonly queues: PulseQueueService,
    private readonly advanceFlowHandler: PulseTicketAdvanceFlowActionHandler,
  ) {
    super();
  }

  async process(job: Job<PulseActionJob>): Promise<void> {
    this.assertValidJob(job.data);

    try {
      if (!ALLOWED_ACTIONS.has(job.data.action)) {
        await this.queues.enqueueTimeline({
          tenantId: job.data.tenantId,
          idempotencyKey: `pulse.timeline:${job.data.tenantId}:${job.data.idempotencyKey}:action-skipped`,
          traceId: job.data.traceId,
          eventType: PULSE_EVENT_TYPES.ACTION_SKIPPED,
          conversationId: job.data.conversationId,
          ticketId: job.data.ticketId,
          payload: {
            action: job.data.action,
            reason: 'action_not_allowed',
          },
          metadata: {
            source: PULSE_QUEUES.ACTIONS,
            idempotencyKey: job.data.idempotencyKey,
          },
        });
        return;
      }

      await this.queues.enqueueTimeline({
        tenantId: job.data.tenantId,
        idempotencyKey: `pulse.timeline:${job.data.tenantId}:${job.data.idempotencyKey}:action-dispatched`,
        traceId: job.data.traceId,
        eventType: PULSE_EVENT_TYPES.ACTION_DISPATCHED,
        conversationId: job.data.conversationId,
        ticketId: job.data.ticketId,
        payload: {
          action: job.data.action,
          payload: job.data.payload,
        },
        metadata: {
          source: PULSE_QUEUES.ACTIONS,
          idempotencyKey: job.data.idempotencyKey,
        },
      });

      const handler = this.handlerFor(job.data.action);
      if (handler) {
        const result = await handler.execute(job.data);
        await this.queues.enqueueTimeline({
          tenantId: job.data.tenantId,
          idempotencyKey: `pulse.timeline:${job.data.tenantId}:${job.data.idempotencyKey}:action-completed`,
          traceId: job.data.traceId,
          eventType: PULSE_EVENT_TYPES.ACTION_COMPLETED,
          conversationId: job.data.conversationId,
          ticketId: job.data.ticketId,
          payload: {
            action: job.data.action,
            prepared: true,
            executable: true,
            sideEffectsApplied: result.sideEffectsApplied,
            result: result.result,
          },
          metadata: {
            source: PULSE_QUEUES.ACTIONS,
            idempotencyKey: job.data.idempotencyKey,
            sideEffectsApplied: result.sideEffectsApplied,
          },
        });
        return;
      }

      await this.queues.enqueueTimeline({
        tenantId: job.data.tenantId,
        idempotencyKey: `pulse.timeline:${job.data.tenantId}:${job.data.idempotencyKey}:action-completed`,
        traceId: job.data.traceId,
        eventType: PULSE_EVENT_TYPES.ACTION_COMPLETED,
        conversationId: job.data.conversationId,
        ticketId: job.data.ticketId,
        payload: {
          action: job.data.action,
          prepared: true,
          executable: false,
          reason: 'action_handler_not_implemented',
        },
        metadata: {
          source: PULSE_QUEUES.ACTIONS,
          idempotencyKey: job.data.idempotencyKey,
          sideEffectsApplied: false,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Pulse action dispatch error';
      this.logger.error(`Pulse action job failed: ${message}`);
      await this.recordFailure(job, message);
      throw error;
    }
  }

  private assertValidJob(job: PulseActionJob) {
    if (!job.tenantId?.trim()) {
      throw new BadRequestException('Pulse action job requires tenantId.');
    }
    if (!job.idempotencyKey?.trim()) {
      throw new BadRequestException('Pulse action job requires idempotencyKey.');
    }
    if (!job.action?.trim()) {
      throw new BadRequestException('Pulse action job requires action.');
    }
    if (!job.payload || typeof job.payload !== 'object' || Array.isArray(job.payload)) {
      throw new BadRequestException('Pulse action job requires object payload.');
    }
  }

  private handlerFor(action: string) {
    return this.advanceFlowHandler.canHandle(action)
      ? this.advanceFlowHandler
      : null;
  }

  private async recordFailure(job: Job<PulseActionJob>, reason: string) {
    await this.queues.enqueueFailed({
      tenantId: job.data.tenantId,
      idempotencyKey: `pulse.failed:${job.data.tenantId}:${job.id ?? job.data.idempotencyKey}`,
      failedQueue: PULSE_QUEUES.ACTIONS,
      failedJobId: String(job.id ?? ''),
      reason,
      payload: {
        action: job.data.action,
        conversationId: job.data.conversationId,
        ticketId: job.data.ticketId,
      },
    });

    await this.queues.enqueueTimeline({
      tenantId: job.data.tenantId,
      idempotencyKey: `pulse.timeline:${job.data.tenantId}:${job.data.idempotencyKey}:action-failed`,
      traceId: job.data.traceId,
      eventType: PULSE_EVENT_TYPES.ACTION_FAILED,
      conversationId: job.data.conversationId,
      ticketId: job.data.ticketId,
      payload: {
        action: job.data.action,
        reason,
        failedJobId: String(job.id ?? ''),
      },
      metadata: {
        source: PULSE_QUEUES.ACTIONS,
        idempotencyKey: job.data.idempotencyKey,
      },
    });
  }
}
