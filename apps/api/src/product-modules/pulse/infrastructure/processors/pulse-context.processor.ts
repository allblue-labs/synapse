import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { RuntimeExecutionLifecycleService } from '../../../../core/runtime/runtime-execution-lifecycle.service';
import { RuntimeExecutionGovernanceService } from '../../../../core/runtime/runtime-execution-governance.service';
import { AssemblePulseContextUseCase } from '../../application/use-cases/assemble-pulse-context.use-case';
import {
  IPulseOperationalEventRepository,
  PULSE_OPERATIONAL_EVENT_REPOSITORY,
} from '../../domain/ports/pulse-operational-event-repository.port';
import { PULSE_EVENT_TYPES } from '../../domain/pulse-event-types';
import {
  PULSE_QUEUES,
  PulseContextJob,
} from '../queues/pulse-queue.contracts';
import { PulseQueueService } from '../queues/pulse-queue.service';

@Processor(PULSE_QUEUES.CONTEXT)
export class PulseContextProcessor extends WorkerHost {
  private readonly logger = new Logger(PulseContextProcessor.name);

  constructor(
    private readonly assembler: AssemblePulseContextUseCase,
    private readonly runtimeLifecycle: RuntimeExecutionLifecycleService,
    private readonly runtimeGovernance: RuntimeExecutionGovernanceService,
    private readonly queues: PulseQueueService,
    @Inject(PULSE_OPERATIONAL_EVENT_REPOSITORY)
    private readonly events: IPulseOperationalEventRepository,
  ) {
    super();
  }

  async process(job: Job<PulseContextJob>): Promise<void> {
    this.assertValidJob(job.data);

    try {
      const contextPack = await this.assembler.execute({
        tenantId: job.data.tenantId,
        skill: job.data.skill,
        executionType: job.data.executionType,
        conversationId: job.data.conversationId,
        ticketId: job.data.ticketId,
        playbookKey: job.data.playbookKey,
        knowledgeLimit: job.data.knowledgeLimit,
      });

      const execution = await this.runtimeLifecycle.request({
        context: {
          tenantId: job.data.tenantId,
          moduleSlug: 'pulse',
          requestId: job.data.traceId,
          actorUserId: job.data.actor?.userId,
          permissions: job.data.actor?.permissions,
          metadata: {
            sourceQueue: PULSE_QUEUES.CONTEXT,
            skill: job.data.skill,
            executionType: job.data.executionType,
            contextPackVersion: contextPack.version,
            ...(job.data.actor ? { actorSnapshot: job.data.actor } : {}),
          },
        },
        requestType: `pulse.${job.data.executionType}`,
        idempotencyKey: job.data.idempotencyKey,
        input: {
          contextPack,
        },
      });

      await this.events.record({
        tenantId: job.data.tenantId,
        eventType: PULSE_EVENT_TYPES.CONTEXT_ASSEMBLED,
        conversationId: job.data.conversationId,
        ticketId: job.data.ticketId,
        payload: {
          executionRequestId: execution.id,
          skill: job.data.skill,
          executionType: job.data.executionType,
          contextPackVersion: contextPack.version,
        },
        metadata: {
          source: PULSE_QUEUES.CONTEXT,
          idempotencyKey: job.data.idempotencyKey,
          traceId: job.data.traceId,
          usageCandidate: 'ai_execution',
        },
      });

      await this.events.record({
        tenantId: job.data.tenantId,
        eventType: PULSE_EVENT_TYPES.RUNTIME_EXECUTION_REQUESTED,
        conversationId: job.data.conversationId,
        ticketId: job.data.ticketId,
        payload: {
          executionRequestId: execution.id,
          requestType: execution.requestType,
          status: 'REQUESTED',
        },
        metadata: {
          source: PULSE_QUEUES.CONTEXT,
          idempotencyKey: job.data.idempotencyKey,
          runtimeProviderCalls: false,
        },
      });

      const queued = await this.runtimeGovernance.approveAndQueue({
        tenantId: job.data.tenantId,
        executionId: execution.id,
        moduleSlug: 'pulse',
        requestType: execution.requestType,
      });

      await this.queues.enqueueExecution({
        tenantId: job.data.tenantId,
        idempotencyKey: `pulse.execution:${job.data.tenantId}:${queued.id}`,
        traceId: job.data.traceId,
        executionRequestId: queued.id,
        contextPackVersion: contextPack.version,
        source: PULSE_QUEUES.CONTEXT,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Pulse context assembly error';
      this.logger.error(`Pulse context job failed: ${message}`);

      await this.recordFailure(job, message);
      throw error;
    }
  }

  private assertValidJob(job: PulseContextJob) {
    if (!job.tenantId?.trim()) {
      throw new BadRequestException('Pulse context job requires tenantId.');
    }
    if (!job.idempotencyKey?.trim()) {
      throw new BadRequestException('Pulse context job requires idempotencyKey.');
    }
    if (!job.skill?.trim()) {
      throw new BadRequestException('Pulse context job requires skill.');
    }
    if (!job.executionType?.trim()) {
      throw new BadRequestException('Pulse context job requires executionType.');
    }
  }

  private async recordFailure(job: Job<PulseContextJob>, reason: string) {
    await this.queues.enqueueFailed({
      tenantId: job.data.tenantId,
      idempotencyKey: `pulse.failed:${job.data.tenantId}:${job.id ?? job.data.idempotencyKey}`,
      failedQueue: PULSE_QUEUES.CONTEXT,
      failedJobId: String(job.id ?? ''),
      reason,
      payload: {
        skill: job.data.skill,
        executionType: job.data.executionType,
        conversationId: job.data.conversationId,
        ticketId: job.data.ticketId,
      },
    });

    await this.events.record({
      tenantId: job.data.tenantId,
      eventType: PULSE_EVENT_TYPES.CONTEXT_ASSEMBLY_FAILED,
      conversationId: job.data.conversationId,
      ticketId: job.data.ticketId,
      payload: {
        reason,
        failedJobId: String(job.id ?? ''),
      },
      metadata: {
        source: PULSE_QUEUES.CONTEXT,
        idempotencyKey: job.data.idempotencyKey,
      },
    });
  }
}
