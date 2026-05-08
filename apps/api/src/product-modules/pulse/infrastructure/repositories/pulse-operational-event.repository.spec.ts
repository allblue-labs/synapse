import { PulseActorType } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { PulseOperationalEventRepository } from './pulse-operational-event.repository';

function createPrismaMock() {
  return {
    pulseOperationalEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };
}

describe('PulseOperationalEventRepository', () => {
  it('records tenant-scoped operational events with audit-safe metadata', async () => {
    const prisma = createPrismaMock();
    prisma.pulseOperationalEvent.create.mockResolvedValue({
      id: 'event_1',
      tenantId: 'tenant_a',
      eventType: 'pulse.ticket.created',
      occurredAt: new Date('2026-05-07T12:00:00.000Z'),
    });
    const repository = new PulseOperationalEventRepository(
      prisma as unknown as PrismaService,
    );

    await repository.record({
      tenantId: 'tenant_a',
      eventType: 'pulse.ticket.created',
      actorType: PulseActorType.USER,
      actorUserId: 'user_1',
      conversationId: 'conversation_1',
      ticketId: 'ticket_1',
      payload: { ticketType: 'SUPPORT' },
      metadata: {
        source: 'unit-test',
        providerToken: 'secret-token',
      },
    });

    expect(prisma.pulseOperationalEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant_a',
        eventType: 'pulse.ticket.created',
        actorType: PulseActorType.USER,
        actorUserId: 'user_1',
        conversationId: 'conversation_1',
        ticketId: 'ticket_1',
        payload: { ticketType: 'SUPPORT' },
        metadata: {
          source: 'unit-test',
          providerToken: '[REDACTED]',
        },
      }),
      select: {
        id: true,
        tenantId: true,
        eventType: true,
        occurredAt: true,
      },
    });
  });

  it('lists conversation events using tenant and conversation filters', async () => {
    const prisma = createPrismaMock();
    prisma.pulseOperationalEvent.findMany.mockResolvedValue([]);
    prisma.pulseOperationalEvent.count.mockResolvedValue(0);
    const repository = new PulseOperationalEventRepository(
      prisma as unknown as PrismaService,
    );

    await repository.listForConversation('tenant_a', 'conversation_1', {
      page: 2,
      pageSize: 10,
      eventType: 'pulse.entry.received',
      occurredFrom: new Date('2026-05-07T00:00:00.000Z'),
      occurredTo: new Date('2026-05-08T00:00:00.000Z'),
    });

    expect(prisma.pulseOperationalEvent.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_a',
        conversationId: 'conversation_1',
        eventType: 'pulse.entry.received',
        occurredAt: {
          gte: new Date('2026-05-07T00:00:00.000Z'),
          lte: new Date('2026-05-08T00:00:00.000Z'),
        },
      },
      select: {
        id: true,
        tenantId: true,
        eventType: true,
        actorType: true,
        actorUserId: true,
        channelId: true,
        conversationId: true,
        ticketId: true,
        payload: true,
        metadata: true,
        occurredAt: true,
      },
      orderBy: { occurredAt: 'asc' },
      skip: 10,
      take: 10,
    });
    expect(prisma.pulseOperationalEvent.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_a',
        conversationId: 'conversation_1',
        eventType: 'pulse.entry.received',
        occurredAt: {
          gte: new Date('2026-05-07T00:00:00.000Z'),
          lte: new Date('2026-05-08T00:00:00.000Z'),
        },
      },
    });
  });

  it('lists ticket events using tenant and ticket filters', async () => {
    const prisma = createPrismaMock();
    prisma.pulseOperationalEvent.findMany.mockResolvedValue([]);
    prisma.pulseOperationalEvent.count.mockResolvedValue(0);
    const repository = new PulseOperationalEventRepository(
      prisma as unknown as PrismaService,
    );

    await repository.listForTicket('tenant_a', 'ticket_1', {
      page: 3,
      pageSize: 5,
      eventType: 'pulse.entry.validated',
      occurredFrom: new Date('2026-05-07T00:00:00.000Z'),
    });

    expect(prisma.pulseOperationalEvent.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_a',
        ticketId: 'ticket_1',
        eventType: 'pulse.entry.validated',
        occurredAt: {
          gte: new Date('2026-05-07T00:00:00.000Z'),
        },
      },
      select: {
        id: true,
        tenantId: true,
        eventType: true,
        actorType: true,
        actorUserId: true,
        channelId: true,
        conversationId: true,
        ticketId: true,
        payload: true,
        metadata: true,
        occurredAt: true,
      },
      orderBy: { occurredAt: 'asc' },
      skip: 10,
      take: 5,
    });
    expect(prisma.pulseOperationalEvent.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_a',
        ticketId: 'ticket_1',
        eventType: 'pulse.entry.validated',
        occurredAt: {
          gte: new Date('2026-05-07T00:00:00.000Z'),
        },
      },
    });
  });

  it('lists timeline categories using tenant and event type sets', async () => {
    const prisma = createPrismaMock();
    prisma.pulseOperationalEvent.findMany.mockResolvedValue([]);
    prisma.pulseOperationalEvent.count.mockResolvedValue(0);
    const repository = new PulseOperationalEventRepository(
      prisma as unknown as PrismaService,
    );

    await repository.listForTicket('tenant_a', 'ticket_1', {
      eventTypes: [
        'pulse.ticket.escalate_ticket',
        'pulse.ticket.advance_flow_state',
      ],
    });

    expect(prisma.pulseOperationalEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant_a',
          ticketId: 'ticket_1',
          eventType: {
            in: [
              'pulse.ticket.escalate_ticket',
              'pulse.ticket.advance_flow_state',
            ],
          },
        },
      }),
    );
  });
});
