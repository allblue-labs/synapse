import { PulseStatus, PulseTicketStatus, PulseTicketType } from '@prisma/client';
import { PulseEntry } from '../../domain/entities/pulse-entry.entity';
import { ValidateEntryUseCase } from './validate-entry.use-case';

function createPulseEntry(overrides: Partial<PulseEntry> = {}) {
  return new PulseEntry(
    overrides.id ?? 'entry_1',
    overrides.tenantId ?? 'tenant_a',
    overrides.conversationId ?? 'conversation_1',
    overrides.status ?? PulseStatus.PENDING_VALIDATION,
    overrides.originalMessage ?? 'Need an appointment',
    overrides.transcription ?? null,
    overrides.mediaUrl ?? null,
    overrides.contactPhone ?? '+15551234567',
    overrides.contactName ?? 'Customer',
    overrides.extractedData ?? { procedure: 'consultation' },
    overrides.confidence ?? 0.91,
    overrides.aiSummary ?? 'Customer wants a consultation.',
    overrides.scheduledAt ?? null,
    overrides.errorMessage ?? null,
    overrides.retryCount ?? 0,
    overrides.processingLogs ?? [],
    overrides.createdAt ?? new Date('2026-05-07T12:00:00.000Z'),
    overrides.updatedAt ?? new Date('2026-05-07T12:00:00.000Z'),
  );
}

describe('ValidateEntryUseCase', () => {
  it('updates the entry, creates a ticket, and records an operational event', async () => {
    const scheduledAt = new Date('2026-05-08T13:00:00.000Z');
    const updated = createPulseEntry({ status: PulseStatus.READY_TO_CONFIRM, scheduledAt });
    const repository = {
      findById: jest.fn().mockResolvedValue(createPulseEntry()),
      update: jest.fn().mockResolvedValue(updated),
    };
    const events = {
      record: jest.fn(),
    };
    const tickets = {
      create: jest.fn().mockResolvedValue({
        id: 'ticket_1',
        tenantId: 'tenant_a',
        conversationId: 'conversation_1',
        type: PulseTicketType.SCHEDULING,
        status: PulseTicketStatus.PENDING_REVIEW,
      }),
    };
    const useCase = new ValidateEntryUseCase(
      repository as never,
      events as never,
      tickets as never,
    );

    await useCase.execute('tenant_a', 'entry_1', { scheduledAt });

    expect(tickets.create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant_a',
      conversationId: 'conversation_1',
      type: PulseTicketType.SCHEDULING,
      status: PulseTicketStatus.PENDING_REVIEW,
      metadata: {
        sourceEntryId: 'entry_1',
        scheduledAt: scheduledAt.toISOString(),
      },
    }));
    expect(events.record).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant_a',
      eventType: 'pulse.entry.validated',
      conversationId: 'conversation_1',
      ticketId: 'ticket_1',
      payload: {
        entryId: 'entry_1',
        ticketId: 'ticket_1',
        status: PulseStatus.READY_TO_CONFIRM,
      },
    }));
  });
});
