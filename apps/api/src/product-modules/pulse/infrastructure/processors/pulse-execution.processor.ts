import { BadRequestException, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ExecutionStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { RuntimeExecutionLifecycleService } from '../../../../core/runtime/runtime-execution-lifecycle.service';
import { PULSE_EVENT_TYPES } from '../../domain/pulse-event-types';
import {
  PULSE_QUEUES,
  PulseExecutionJob,
} from '../queues/pulse-queue.contracts';
import { PulseQueueService } from '../queues/pulse-queue.service';

@Processor(PULSE_QUEUES.EXECUTION)
export class PulseExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(PulseExecutionProcessor.name);

  constructor(
    private readonly runtimeLifecycle: RuntimeExecutionLifecycleService,
    private readonly queues: PulseQueueService,
  ) {
    super();
  }

  async process(job: Job<PulseExecutionJob>): Promise<void> {
    this.assertValidJob(job.data);

    try {
      const current = await this.runtimeLifecycle.get(
        job.data.tenantId,
        job.data.executionRequestId,
      );

      if (current.status !== ExecutionStatus.QUEUED) {
        await this.queues.enqueueTimeline({
          tenantId: job.data.tenantId,
          idempotencyKey: `pulse.timeline:${job.data.tenantId}:${job.data.executionRequestId}:dispatch-skipped`,
          traceId: job.data.traceId,
          eventType: PULSE_EVENT_TYPES.RUNTIME_EXECUTION_DISPATCH_SKIPPED,
          payload: {
            executionRequestId: job.data.executionRequestId,
            currentStatus: current.status,
            reason: 'execution_not_queued',
          },
          metadata: {
            source: PULSE_QUEUES.EXECUTION,
            idempotencyKey: job.data.idempotencyKey,
          },
        });
        return;
      }

      await this.runtimeLifecycle.transition({
        tenantId: job.data.tenantId,
        executionId: job.data.executionRequestId,
        status: ExecutionStatus.RUNNING,
        output: {
          dispatch: {
            providerCalls: false,
            stage: 'runtime_dispatch_prepared',
          },
        },
      });

      await this.queues.enqueueTimeline({
        tenantId: job.data.tenantId,
        idempotencyKey: `pulse.timeline:${job.data.tenantId}:${job.data.executionRequestId}:dispatched`,
        traceId: job.data.traceId,
        eventType: PULSE_EVENT_TYPES.RUNTIME_EXECUTION_DISPATCHED,
        payload: {
          executionRequestId: job.data.executionRequestId,
          status: ExecutionStatus.RUNNING,
          providerCalls: false,
        },
        metadata: {
          source: PULSE_QUEUES.EXECUTION,
          idempotencyKey: job.data.idempotencyKey,
          contextPackVersion: job.data.contextPackVersion,
        },
      });

      await this.runtimeLifecycle.transition({
        tenantId: job.data.tenantId,
        executionId: job.data.executionRequestId,
        status: ExecutionStatus.SUCCEEDED,
        output: {
          dispatch: {
            prepared: true,
            executable: false,
            reason: 'runtime_provider_not_implemented',
            providerCalls: false,
            contextPackVersion: job.data.contextPackVersion,
          },
        },
      });

      await this.queues.enqueueTimeline({
        tenantId: job.data.tenantId,
        idempotencyKey: `pulse.timeline:${job.data.tenantId}:${job.data.executionRequestId}:dispatch-completed`,
        traceId: job.data.traceId,
        eventType: PULSE_EVENT_TYPES.RUNTIME_EXECUTION_DISPATCH_COMPLETED,
        payload: {
          executionRequestId: job.data.executionRequestId,
          status: ExecutionStatus.SUCCEEDED,
          prepared: true,
          executable: false,
          reason: 'runtime_provider_not_implemented',
        },
        metadata: {
          source: PULSE_QUEUES.EXECUTION,
          idempotencyKey: job.data.idempotencyKey,
          providerCalls: false,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Pulse execution dispatch error';
      this.logger.error(`Pulse execution job failed: ${message}`);
      await this.recordFailure(job, message);
      throw error;
    }
  }

  private assertValidJob(job: PulseExecutionJob) {
    if (!job.tenantId?.trim()) {
      throw new BadRequestException('Pulse execution job requires tenantId.');
    }
    if (!job.idempotencyKey?.trim()) {
      throw new BadRequestException('Pulse execution job requires idempotencyKey.');
    }
    if (!job.executionRequestId?.trim()) {
      throw new BadRequestException('Pulse execution job requires executionRequestId.');
    }
    if (!job.contextPackVersion?.trim()) {
      throw new BadRequestException('Pulse execution job requires contextPackVersion.');
    }
  }

  private async recordFailure(job: Job<PulseExecutionJob>, reason: string) {
    await this.queues.enqueueFailed({
      tenantId: job.data.tenantId,
      idempotencyKey: `pulse.failed:${job.data.tenantId}:${job.id ?? job.data.idempotencyKey}`,
      failedQueue: PULSE_QUEUES.EXECUTION,
      failedJobId: String(job.id ?? ''),
      reason,
      payload: {
        executionRequestId: job.data.executionRequestId,
        contextPackVersion: job.data.contextPackVersion,
      },
    });

    await this.queues.enqueueTimeline({
      tenantId: job.data.tenantId,
      idempotencyKey: `pulse.timeline:${job.data.tenantId}:${job.data.executionRequestId}:dispatch-failed`,
      traceId: job.data.traceId,
      eventType: PULSE_EVENT_TYPES.RUNTIME_EXECUTION_DISPATCH_FAILED,
      payload: {
        executionRequestId: job.data.executionRequestId,
        reason,
        failedJobId: String(job.id ?? ''),
      },
      metadata: {
        source: PULSE_QUEUES.EXECUTION,
        idempotencyKey: job.data.idempotencyKey,
      },
    });
  }
}
