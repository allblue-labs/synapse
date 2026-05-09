import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { JobsOptions, Queue } from 'bullmq';
import {
  PULSE_QUEUES,
  PulseActionJob,
  PulseContextJob,
  PulseExecutionJob,
  PulseFailedJob,
  PulseInboundJob,
  PulseTimelineJob,
} from './pulse-queue.contracts';

export const PULSE_DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 3_000 },
  removeOnComplete: { age: 60 * 60 * 24, count: 500 },
  removeOnFail: false,
} as const;

const QUEUE_JOB_NAMES = {
  [PULSE_QUEUES.INBOUND]: 'pulse.inbound.process',
  [PULSE_QUEUES.CONTEXT]: 'pulse.context.assemble',
  [PULSE_QUEUES.EXECUTION]: 'pulse.execution.request',
  [PULSE_QUEUES.ACTIONS]: 'pulse.actions.dispatch',
  [PULSE_QUEUES.TIMELINE]: 'pulse.timeline.append',
  [PULSE_QUEUES.FAILED]: 'pulse.failed.capture',
} as const;

@Injectable()
export class PulseQueueService {
  constructor(
    @InjectQueue(PULSE_QUEUES.INBOUND)
    private readonly inbound: Queue<PulseInboundJob>,
    @InjectQueue(PULSE_QUEUES.CONTEXT)
    private readonly context: Queue<PulseContextJob>,
    @InjectQueue(PULSE_QUEUES.EXECUTION)
    private readonly execution: Queue<PulseExecutionJob>,
    @InjectQueue(PULSE_QUEUES.ACTIONS)
    private readonly actions: Queue<PulseActionJob>,
    @InjectQueue(PULSE_QUEUES.TIMELINE)
    private readonly timeline: Queue<PulseTimelineJob>,
    @InjectQueue(PULSE_QUEUES.FAILED)
    private readonly failed: Queue<PulseFailedJob>,
  ) {}

  enqueueInbound(job: Omit<PulseInboundJob, 'requestedAt' | 'idempotencyKey'> & {
    idempotencyKey?: string;
  }) {
    const payload: PulseInboundJob = {
      ...job,
      requestedAt: new Date().toISOString(),
      idempotencyKey: job.idempotencyKey ?? `pulse.inbound:${job.tenantId}:${job.entryId}`,
      source: job.source ?? 'pulse.entry',
    };
    return this.inbound.add(
      QUEUE_JOB_NAMES[PULSE_QUEUES.INBOUND],
      payload,
      this.options(payload.idempotencyKey),
    );
  }

  enqueueContext(job: Omit<PulseContextJob, 'requestedAt'>) {
    const payload: PulseContextJob = {
      ...job,
      requestedAt: new Date().toISOString(),
      source: job.source ?? 'pulse.context',
    };
    return this.context.add(
      QUEUE_JOB_NAMES[PULSE_QUEUES.CONTEXT],
      payload,
      this.options(payload.idempotencyKey),
    );
  }

  enqueueExecution(job: Omit<PulseExecutionJob, 'requestedAt'>) {
    const payload: PulseExecutionJob = {
      ...job,
      requestedAt: new Date().toISOString(),
      source: job.source ?? 'pulse.execution',
    };
    return this.execution.add(
      QUEUE_JOB_NAMES[PULSE_QUEUES.EXECUTION],
      payload,
      this.options(payload.idempotencyKey),
    );
  }

  enqueueAction(job: Omit<PulseActionJob, 'requestedAt'>) {
    const payload: PulseActionJob = {
      ...job,
      requestedAt: new Date().toISOString(),
      source: job.source ?? 'pulse.actions',
    };
    return this.actions.add(
      QUEUE_JOB_NAMES[PULSE_QUEUES.ACTIONS],
      payload,
      this.options(payload.idempotencyKey),
    );
  }

  enqueueTimeline(job: Omit<PulseTimelineJob, 'requestedAt'>) {
    const payload: PulseTimelineJob = {
      ...job,
      requestedAt: new Date().toISOString(),
      source: job.source ?? 'pulse.timeline',
    };
    return this.timeline.add(
      QUEUE_JOB_NAMES[PULSE_QUEUES.TIMELINE],
      payload,
      this.options(payload.idempotencyKey),
    );
  }

  enqueueFailed(job: Omit<PulseFailedJob, 'requestedAt'>) {
    const payload: PulseFailedJob = {
      ...job,
      requestedAt: new Date().toISOString(),
      source: job.source ?? 'pulse.failed',
    };
    return this.failed.add(
      QUEUE_JOB_NAMES[PULSE_QUEUES.FAILED],
      payload,
      this.options(payload.idempotencyKey, { attempts: 1 }),
    );
  }

  private options(jobId: string, overrides: JobsOptions = {}): JobsOptions {
    return {
      ...PULSE_DEFAULT_JOB_OPTIONS,
      ...overrides,
      jobId,
    };
  }
}
