import { BadRequestException, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ExecutionStatus } from '@prisma/client';
import type { ExecutionRequestContract, ExecutionResponseContract } from '@synapse/contracts';
import { Job } from 'bullmq';
import { RuntimeExecutionDispatchService } from '../../../../core/runtime/runtime-execution-dispatch.service';
import { RuntimeExecutionLifecycleService } from '../../../../core/runtime/runtime-execution-lifecycle.service';
import { IngestPulseRuntimeResultUseCase } from '../../application/use-cases/ingest-pulse-runtime-result.use-case';
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
    private readonly runtimeDispatcher: RuntimeExecutionDispatchService,
    private readonly ingestRuntimeResult: IngestPulseRuntimeResultUseCase,
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

      const dispatched = await this.runtimeDispatcher.dispatchQueued({
        tenantId: job.data.tenantId,
        executionId: job.data.executionRequestId,
      });
      const { request, response: runtimeResponse, transport } = dispatched;

      await this.queues.enqueueTimeline({
        tenantId: job.data.tenantId,
        idempotencyKey: `pulse.timeline:${job.data.tenantId}:${job.data.executionRequestId}:dispatched`,
        traceId: job.data.traceId,
        eventType: PULSE_EVENT_TYPES.RUNTIME_EXECUTION_DISPATCHED,
        payload: {
          executionRequestId: job.data.executionRequestId,
          status: ExecutionStatus.RUNNING,
          providerCalls: true,
        },
        metadata: {
          source: PULSE_QUEUES.EXECUTION,
          idempotencyKey: job.data.idempotencyKey,
          contextPackVersion: job.data.contextPackVersion,
          transport,
        },
      });

      const moduleOutput = this.moduleOutput(runtimeResponse);
      if (this.hasActorSnapshot(request)) {
        await this.ingestRuntimeResult.execute({
          tenantId: job.data.tenantId,
          executionRequestId: job.data.executionRequestId,
          status: runtimeResponse.status,
          output: moduleOutput,
          errorMessage: runtimeResponse.errorMessage,
          traceId: job.data.traceId,
        });
      } else {
        await this.runtimeLifecycle.transition({
          tenantId: job.data.tenantId,
          executionId: job.data.executionRequestId,
          status: runtimeResponse.status,
          output: moduleOutput ?? runtimeResponse.output,
          errorMessage: runtimeResponse.errorMessage,
        });
      }

      await this.queues.enqueueTimeline({
        tenantId: job.data.tenantId,
        idempotencyKey: `pulse.timeline:${job.data.tenantId}:${job.data.executionRequestId}:dispatch-completed`,
        traceId: job.data.traceId,
        eventType: PULSE_EVENT_TYPES.RUNTIME_EXECUTION_DISPATCH_COMPLETED,
        payload: {
          executionRequestId: job.data.executionRequestId,
          status: runtimeResponse.status,
          provider: this.stringValue(runtimeResponse.output?.provider),
          model: this.stringValue(runtimeResponse.output?.model),
          providerCalls: true,
          actionPlanning: this.hasActorSnapshot(request) ? 'ingested' : 'skipped_missing_actor_snapshot',
        },
        metadata: {
          source: PULSE_QUEUES.EXECUTION,
          idempotencyKey: job.data.idempotencyKey,
          providerCalls: true,
          transport,
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

  private moduleOutput(response: ExecutionResponseContract) {
    const output = response.output;
    if (!output || typeof output !== 'object') {
      return undefined;
    }
    const structuredPayload = output.structuredPayload;
    if (structuredPayload && typeof structuredPayload === 'object' && !Array.isArray(structuredPayload)) {
      return structuredPayload as Record<string, unknown>;
    }
    const raw = output.output;
    if (typeof raw !== 'string') {
      return undefined;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  private hasActorSnapshot(request: ExecutionRequestContract) {
    const actor = request.context.metadata?.actorSnapshot;
    return Boolean(actor && typeof actor === 'object' && !Array.isArray(actor));
  }

  private stringValue(value: unknown) {
    return typeof value === 'string' ? value : undefined;
  }
}
