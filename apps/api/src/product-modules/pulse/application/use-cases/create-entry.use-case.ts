import {Inject, Injectable} from '@nestjs/common';
import {InjectQueue} from '@nestjs/bullmq';
import {Queue} from 'bullmq';
import {UsageMeteringService, UsageMetricType} from '../../../../modules/usage/usage-metering.service';
import {
  PULSE_REPOSITORY,
  IPulseRepository,
} from '../../domain/ports/pulse-repository.port';
import {PULSE_QUEUE, DEFAULT_JOB_OPTIONS} from '../../infrastructure/processors/pulse.processor';
import {ProcessPulseJob} from '../../contracts/pulse.contracts';

export interface CreateEntryInput {
  tenantId: string;
  contactPhone: string;
  contactName?: string;
  originalMessage?: string;
  mediaUrl?: string;
  conversationId?: string;
}

@Injectable()
export class CreateEntryUseCase {
  constructor(
    @Inject(PULSE_REPOSITORY)
    private readonly repository: IPulseRepository,
    @InjectQueue(PULSE_QUEUE)
    private readonly queue: Queue<ProcessPulseJob>,
    private readonly usage: UsageMeteringService,
  ) {}

  async execute(input: CreateEntryInput) {
    const entry = await this.repository.create(input);

    await this.queue.add(
      'process',
      {tenantId: input.tenantId, entryId: entry.id},
      {...DEFAULT_JOB_OPTIONS, jobId: `pulse:${entry.id}`},
    );

    await this.usage.record({
      tenantId: input.tenantId,
      moduleSlug: 'pulse',
      metricType: UsageMetricType.AUTOMATION_EXECUTION,
      quantity: 1,
      unit: 'execution',
      resourceType: 'PulseEntry',
      resourceId: entry.id,
      idempotencyKey: `pulse-entry-created:${entry.id}`,
      metadata: {
        hasMedia: !!input.mediaUrl,
      },
    });

    return entry;
  }
}
