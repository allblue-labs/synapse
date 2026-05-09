import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Prisma, PulseActorType } from '@prisma/client';
import { Job } from 'bullmq';
import {
  IPulseOperationalEventRepository,
  PULSE_OPERATIONAL_EVENT_REPOSITORY,
} from '../../domain/ports/pulse-operational-event-repository.port';
import {
  PULSE_QUEUES,
  PulseTimelineJob,
} from '../queues/pulse-queue.contracts';
import { PulseQueueService } from '../queues/pulse-queue.service';

@Processor(PULSE_QUEUES.TIMELINE)
export class PulseTimelineProcessor extends WorkerHost {
  private readonly logger = new Logger(PulseTimelineProcessor.name);

  constructor(
    @Inject(PULSE_OPERATIONAL_EVENT_REPOSITORY)
    private readonly events: IPulseOperationalEventRepository,
    private readonly queues: PulseQueueService,
  ) {
    super();
  }

  async process(job: Job<PulseTimelineJob>): Promise<void> {
    this.assertValidJob(job.data);

    try {
      await this.events.record({
        tenantId: job.data.tenantId,
        eventType: job.data.eventType,
        actorType: this.actorType(job.data.actorType),
        actorUserId: job.data.actorUserId,
        channelId: job.data.channelId ?? undefined,
        conversationId: job.data.conversationId ?? undefined,
        ticketId: job.data.ticketId ?? undefined,
        payload: (job.data.payload ?? {}) as Prisma.InputJsonValue,
        metadata: {
          ...(job.data.metadata ?? {}),
          source: job.data.metadata?.source ?? job.data.source ?? PULSE_QUEUES.TIMELINE,
          sourceQueue: PULSE_QUEUES.TIMELINE,
          idempotencyKey: job.data.idempotencyKey,
          traceId: job.data.traceId,
        } as Prisma.InputJsonValue,
        occurredAt: job.data.occurredAt ? new Date(job.data.occurredAt) : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Pulse timeline projection error';
      this.logger.error(`Pulse timeline job failed: ${message}`);
      await this.queues.enqueueFailed({
        tenantId: job.data.tenantId,
        idempotencyKey: `pulse.failed:${job.data.tenantId}:${job.id ?? job.data.idempotencyKey}`,
        failedQueue: PULSE_QUEUES.TIMELINE,
        failedJobId: String(job.id ?? ''),
        reason: message,
        payload: {
          eventType: job.data.eventType,
          conversationId: job.data.conversationId,
          ticketId: job.data.ticketId,
        },
      });
      throw error;
    }
  }

  private assertValidJob(job: PulseTimelineJob) {
    if (!job.tenantId?.trim()) {
      throw new BadRequestException('Pulse timeline job requires tenantId.');
    }
    if (!job.idempotencyKey?.trim()) {
      throw new BadRequestException('Pulse timeline job requires idempotencyKey.');
    }
    if (!job.eventType?.trim()) {
      throw new BadRequestException('Pulse timeline job requires eventType.');
    }
  }

  private actorType(actorType?: string): PulseActorType | undefined {
    if (!actorType) {
      return undefined;
    }

    return Object.values(PulseActorType).includes(actorType as PulseActorType)
      ? actorType as PulseActorType
      : PulseActorType.SYSTEM;
  }
}
