import {BadRequestException, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {PulseStatus} from '@prisma/client';
import {InjectQueue} from '@nestjs/bullmq';
import {Queue} from 'bullmq';
import {
  PULSE_REPOSITORY,
  IPulseRepository,
} from '../../domain/ports/pulse-repository.port';
import {
  IPulseOperationalEventRepository,
  PULSE_OPERATIONAL_EVENT_REPOSITORY,
} from '../../domain/ports/pulse-operational-event-repository.port';
import {PULSE_EVENT_TYPES} from '../../domain/pulse-event-types';
import {PULSE_QUEUE, DEFAULT_JOB_OPTIONS} from '../../infrastructure/processors/pulse.processor';
import {ProcessPulseJob} from '../../contracts/pulse.contracts';

@Injectable()
export class RetryEntryUseCase {
  constructor(
    @Inject(PULSE_REPOSITORY)
    private readonly repository: IPulseRepository,
    @InjectQueue(PULSE_QUEUE)
    private readonly queue: Queue<ProcessPulseJob>,
    @Inject(PULSE_OPERATIONAL_EVENT_REPOSITORY)
    private readonly events: IPulseOperationalEventRepository,
  ) {}

  async execute(tenantId: string, id: string) {
    const entry = await this.repository.findById(tenantId, id);
    if (!entry) throw new NotFoundException(`Pulse entry ${id} not found`);
    if (!entry.canRetry()) {
      throw new BadRequestException(
        entry.retryCount >= 3
          ? 'Maximum retry attempts reached'
          : `Entry cannot be retried from status "${entry.status}"`,
      );
    }

    const updated = await this.repository.update(tenantId, id, {
      status: PulseStatus.PROCESSING,
      errorMessage: null,
      retryCount: entry.retryCount + 1,
    });

    await this.queue.add('process', {tenantId, entryId: id}, DEFAULT_JOB_OPTIONS);

    await this.events.record({
      tenantId,
      eventType: PULSE_EVENT_TYPES.ENTRY_RETRY_REQUESTED,
      conversationId: updated.conversationId ?? undefined,
      payload: {
        entryId: updated.id,
        retryCount: updated.retryCount,
      },
    });

    return updated;
  }
}
