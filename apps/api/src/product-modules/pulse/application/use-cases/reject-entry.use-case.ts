import {BadRequestException, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {PulseStatus} from '@prisma/client';
import {
  PULSE_REPOSITORY,
  IPulseRepository,
} from '../../domain/ports/pulse-repository.port';
import {
  IPulseOperationalEventRepository,
  PULSE_OPERATIONAL_EVENT_REPOSITORY,
} from '../../domain/ports/pulse-operational-event-repository.port';
import {PULSE_EVENT_TYPES} from '../../domain/pulse-event-types';

@Injectable()
export class RejectEntryUseCase {
  constructor(
    @Inject(PULSE_REPOSITORY)
    private readonly repository: IPulseRepository,
    @Inject(PULSE_OPERATIONAL_EVENT_REPOSITORY)
    private readonly events: IPulseOperationalEventRepository,
  ) {}

  async execute(tenantId: string, id: string, reason?: string) {
    const entry = await this.repository.findById(tenantId, id);
    if (!entry) throw new NotFoundException(`Pulse entry ${id} not found`);

    const validStatuses: PulseStatus[] = [
      PulseStatus.PENDING_VALIDATION,
      PulseStatus.READY_TO_CONFIRM,
    ];
    if (!validStatuses.includes(entry.status)) {
      throw new BadRequestException(
        `Entry cannot be rejected from status "${entry.status}"`,
      );
    }

    const updated = await this.repository.update(tenantId, id, {
      status: PulseStatus.FAILED,
      errorMessage: reason ?? 'Rejected by operator',
    });

    await this.events.record({
      tenantId,
      eventType: PULSE_EVENT_TYPES.ENTRY_REJECTED,
      conversationId: updated.conversationId ?? undefined,
      payload: {
        entryId: updated.id,
        status: updated.status,
      },
      metadata: {
        reason: reason ?? 'Rejected by operator',
      },
    });

    return updated;
  }
}
