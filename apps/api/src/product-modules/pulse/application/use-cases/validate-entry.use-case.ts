import {BadRequestException, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {PulseStatus, PulseTicketStatus, PulseTicketType} from '@prisma/client';
import {
  PULSE_REPOSITORY,
  IPulseRepository,
} from '../../domain/ports/pulse-repository.port';
import {
  IPulseOperationalEventRepository,
  PULSE_OPERATIONAL_EVENT_REPOSITORY,
} from '../../domain/ports/pulse-operational-event-repository.port';
import {
  IPulseTicketRepository,
  PULSE_TICKET_REPOSITORY,
} from '../../domain/ports/pulse-ticket-repository.port';
import {PulseExtractedData} from '../../contracts/pulse.contracts';

@Injectable()
export class ValidateEntryUseCase {
  constructor(
    @Inject(PULSE_REPOSITORY)
    private readonly repository: IPulseRepository,
    @Inject(PULSE_OPERATIONAL_EVENT_REPOSITORY)
    private readonly events: IPulseOperationalEventRepository,
    @Inject(PULSE_TICKET_REPOSITORY)
    private readonly tickets: IPulseTicketRepository,
  ) {}

  async execute(
    tenantId: string,
    id: string,
    overrides?: {extractedData?: PulseExtractedData; scheduledAt?: Date},
  ) {
    const entry = await this.repository.findById(tenantId, id);
    if (!entry) throw new NotFoundException(`Pulse entry ${id} not found`);
    if (!entry.canValidate()) {
      throw new BadRequestException(
        `Entry cannot be validated from status "${entry.status}"`,
      );
    }

    const updated = await this.repository.update(tenantId, id, {
      status: PulseStatus.READY_TO_CONFIRM,
      ...(overrides?.extractedData && {extractedData: overrides.extractedData}),
      ...(overrides?.scheduledAt && {scheduledAt: overrides.scheduledAt}),
    });

    const ticket = await this.tickets.create({
      tenantId,
      conversationId: updated.conversationId,
      type: PulseTicketType.SCHEDULING,
      status: PulseTicketStatus.PENDING_REVIEW,
      title: 'Review Pulse operational request',
      summary: updated.aiSummary,
      confidence: updated.confidence,
      metadata: {
        sourceEntryId: updated.id,
        scheduledAt: updated.scheduledAt?.toISOString() ?? null,
      },
    });

    await this.events.record({
      tenantId,
      eventType: 'pulse.entry.validated',
      conversationId: updated.conversationId ?? undefined,
      ticketId: ticket.id,
      payload: {
        entryId: updated.id,
        ticketId: ticket.id,
        status: updated.status,
      },
      metadata: {
        scheduledAt: updated.scheduledAt?.toISOString() ?? null,
      },
    });

    return updated;
  }
}
