import { PulseTicketStatus, PulseTicketType } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { PulseTicketRepository } from './pulse-ticket.repository';

function createPrismaMock() {
  return {
    pulseTicket: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };
}

describe('PulseTicketRepository', () => {
  it('finds tickets using tenant and id filters', async () => {
    const prisma = createPrismaMock();
    prisma.pulseTicket.findFirst.mockResolvedValue({
      id: 'ticket_1',
      tenantId: 'tenant_a',
      conversationId: 'conversation_1',
      type: PulseTicketType.SCHEDULING,
      status: PulseTicketStatus.PENDING_REVIEW,
    });
    const repository = new PulseTicketRepository(prisma as unknown as PrismaService);

    await repository.findById('tenant_a', 'ticket_1');

    expect(prisma.pulseTicket.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_a', id: 'ticket_1' },
      select: {
        id: true,
        tenantId: true,
        conversationId: true,
        type: true,
        status: true,
      },
    });
  });

  it('lists tickets using tenant filters', async () => {
    const prisma = createPrismaMock();
    prisma.pulseTicket.findMany.mockResolvedValue([]);
    prisma.pulseTicket.count.mockResolvedValue(0);
    const repository = new PulseTicketRepository(prisma as unknown as PrismaService);

    await repository.list('tenant_a', {
      page: 2,
      pageSize: 25,
      type: PulseTicketType.SCHEDULING,
      status: PulseTicketStatus.PENDING_REVIEW,
    });

    expect(prisma.pulseTicket.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_a',
        type: PulseTicketType.SCHEDULING,
        status: PulseTicketStatus.PENDING_REVIEW,
      },
      select: {
        id: true,
        tenantId: true,
        conversationId: true,
        type: true,
        status: true,
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      skip: 25,
      take: 25,
    });
    expect(prisma.pulseTicket.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_a',
        type: PulseTicketType.SCHEDULING,
        status: PulseTicketStatus.PENDING_REVIEW,
      },
    });
  });

  it('creates tenant-scoped operational tickets', async () => {
    const prisma = createPrismaMock();
    prisma.pulseTicket.create.mockResolvedValue({
      id: 'ticket_1',
      tenantId: 'tenant_a',
      conversationId: 'conversation_1',
      type: PulseTicketType.SCHEDULING,
      status: PulseTicketStatus.PENDING_REVIEW,
    });
    const repository = new PulseTicketRepository(prisma as unknown as PrismaService);

    await repository.create({
      tenantId: 'tenant_a',
      conversationId: 'conversation_1',
      type: PulseTicketType.SCHEDULING,
      status: PulseTicketStatus.PENDING_REVIEW,
      title: 'Review scheduling request',
      summary: 'Customer wants an appointment.',
      confidence: 0.82,
      metadata: { sourceEntryId: 'entry_1' },
    });

    expect(prisma.pulseTicket.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant_a',
        conversationId: 'conversation_1',
        type: PulseTicketType.SCHEDULING,
        status: PulseTicketStatus.PENDING_REVIEW,
        title: 'Review scheduling request',
        summary: 'Customer wants an appointment.',
        confidence: 0.82,
        metadata: { sourceEntryId: 'entry_1' },
      },
      select: {
        id: true,
        tenantId: true,
        conversationId: true,
        type: true,
        status: true,
      },
    });
  });
});
