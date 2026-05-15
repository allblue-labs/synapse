import { BadRequestException, ForbiddenException, Logger, Optional } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { UsageMetricType } from '@prisma/client';
import { Job, UnrecoverableError } from 'bullmq';
import { BillingService } from '../../../../modules/billing/billing.service';
import { PulseActionHandlerRegistry } from '../../application/actions/pulse-action-handler.registry';
import { PulseActionTelemetryService } from '../../application/services/pulse-action-telemetry.service';
import {
  PulseActionPayloadValidationException,
} from '../../application/actions/pulse-ticket-advance-flow-action.handler';
import { PulseActionFailureClass } from '../../domain/ports/pulse-action-handler.port';
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
    private readonly handlers: PulseActionHandlerRegistry,
    private readonly billing: BillingService,
    @Optional()
    private readonly actionTelemetry?: PulseActionTelemetryService,
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
        this.recordTelemetry(job.data, 'skipped', {
          reason: 'action_not_allowed',
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
        this.assertHandlerPermissions(job.data);
        const result = await handler.execute(job.data);
        await this.consumeUsageForCompletedAction(job.data, result.sideEffectsApplied);
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
        this.recordTelemetry(job.data, 'completed', {
          sideEffectsApplied: result.sideEffectsApplied,
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
      this.recordTelemetry(job.data, 'prepared', {
        sideEffectsApplied: false,
        reason: 'action_handler_not_implemented',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Pulse action dispatch error';
      const failureClass = this.failureClass(error);
      const retryable = failureClass === 'retryable';
      this.logger.error(`Pulse action job failed: ${message}`);
      this.recordTelemetry(job.data, 'failed', {
        failureClass,
        reason: this.safeFailureReason(message),
      });
      await this.recordFailure(job, message, failureClass);
      if (!retryable) {
        throw new UnrecoverableError(message);
      }
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
    return this.handlers.find(action);
  }

  private assertHandlerPermissions(job: PulseActionJob) {
    const definition = this.handlers.definition(job.action);
    if (!definition) {
      throw new ForbiddenException(`Pulse action is not governed for execution: ${job.action}`);
    }
    if (!job.actor) {
      throw new ForbiddenException(`Pulse action requires actor metadata before execution: ${job.action}`);
    }

    const missing = definition.permissions.filter((permission) => !job.actor?.permissions.includes(permission));
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing required action permission(s): ${missing.join(', ')}`);
    }
  }

  private async consumeUsageForCompletedAction(job: PulseActionJob, sideEffectsApplied: boolean) {
    if (!sideEffectsApplied) {
      return;
    }

    const definition = this.handlers.definition(job.action);
    if (definition?.usageCandidate !== 'workflow_run') {
      return;
    }

    await this.billing.consumeUsageOrReject({
      tenantId: job.tenantId,
      moduleSlug: 'pulse',
      metricType: UsageMetricType.WORKFLOW_RUN,
      quantity: 1,
      unit: 'workflow_run',
      resourceType: 'PulseAction',
      resourceId: job.ticketId ?? job.conversationId ?? job.idempotencyKey,
      idempotencyKey: `pulse-action-usage:${job.idempotencyKey}`,
      credits: 1,
      metadata: {
        action: job.action,
        ticketId: job.ticketId ?? null,
        conversationId: job.conversationId ?? null,
        usageCandidate: definition.usageCandidate,
      },
    });
  }

  private failureClass(error: unknown) {
    if (error instanceof ForbiddenException) {
      return 'non_retryable_governance';
    }
    if (error instanceof PulseActionPayloadValidationException) {
      return 'non_retryable_validation';
    }
    return 'retryable';
  }

  private async recordFailure(
    job: Job<PulseActionJob>,
    reason: string,
    failureClass: PulseActionFailureClass = 'retryable',
  ) {
    const retryable = failureClass === 'retryable';
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
        failureClass,
        retryable,
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
        failureClass,
        retryable,
      },
      metadata: {
        source: PULSE_QUEUES.ACTIONS,
        idempotencyKey: job.data.idempotencyKey,
      },
    });
  }

  private recordTelemetry(
    job: PulseActionJob,
    outcome: 'skipped' | 'completed' | 'prepared' | 'failed',
    details: {
      failureClass?: string;
      reason?: string;
      sideEffectsApplied?: boolean;
    } = {},
  ) {
    this.actionTelemetry?.record({
      tenantId: job.tenantId,
      action: job.action,
      idempotencyKey: job.idempotencyKey,
      ticketId: job.ticketId,
      conversationId: job.conversationId,
      outcome,
      failureClass: details.failureClass,
      reason: details.reason,
      sideEffectsApplied: details.sideEffectsApplied,
      queue: PULSE_QUEUES.ACTIONS,
    });
  }

  private safeFailureReason(message: string) {
    if (/permission/i.test(message)) {
      return 'permission_denied';
    }
    if (/validation|requires|unsupported|invalid/i.test(message)) {
      return 'validation_failed';
    }
    if (/progress/i.test(message)) {
      return 'action_in_progress';
    }
    return 'action_failed';
  }
}
