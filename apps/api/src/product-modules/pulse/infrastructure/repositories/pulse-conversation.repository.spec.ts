import {
  PulseConversationState,
  PulseOperationalStatus,
} from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { PulseConversationRepository } from './pulse-conversation.repository';

function createPrismaMock() {
  return {
    pulseConversation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };
}

describe('PulseConversationRepository', () => {
  it('lists conversations using tenant filters', async () => {
    const prisma = createPrismaMock();
    prisma.pulseConversation.findMany.mockResolvedValue([]);
    prisma.pulseConversation.count.mockResolvedValue(0);
    const repository = new PulseConversationRepository(prisma as unknown as PrismaService);

    await repository.list('tenant_a', {
      page: 3,
      pageSize: 5,
      state: PulseConversationState.IN_FLOW,
      operationalStatus: PulseOperationalStatus.ACTIVE,
    });

    expect(prisma.pulseConversation.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_a',
        state: PulseConversationState.IN_FLOW,
        operationalStatus: PulseOperationalStatus.ACTIVE,
      },
      select: {
        id: true,
        tenantId: true,
        channelId: true,
        participantRef: true,
        state: true,
        operationalStatus: true,
      },
      orderBy: [{ lastActivityAt: 'desc' }, { createdAt: 'desc' }],
      skip: 10,
      take: 5,
    });
    expect(prisma.pulseConversation.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_a',
        state: PulseConversationState.IN_FLOW,
        operationalStatus: PulseOperationalStatus.ACTIVE,
      },
    });
  });

  it('finds conversations using tenant and id filters', async () => {
    const prisma = createPrismaMock();
    prisma.pulseConversation.findFirst.mockResolvedValue({
      id: 'conversation_1',
      tenantId: 'tenant_a',
      channelId: 'channel_1',
      participantRef: '+15551234567',
      state: PulseConversationState.IN_FLOW,
      operationalStatus: PulseOperationalStatus.ACTIVE,
    });
    const repository = new PulseConversationRepository(prisma as unknown as PrismaService);

    await repository.findById('tenant_a', 'conversation_1');

    expect(prisma.pulseConversation.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_a', id: 'conversation_1' },
      select: {
        id: true,
        tenantId: true,
        channelId: true,
        participantRef: true,
        state: true,
        operationalStatus: true,
      },
    });
  });

  it('resolves conversations using tenant/channel/participant uniqueness', async () => {
    const prisma = createPrismaMock();
    prisma.pulseConversation.upsert.mockResolvedValue({
      id: 'conversation_1',
      tenantId: 'tenant_a',
      channelId: 'channel_1',
      participantRef: '+15551234567',
      state: PulseConversationState.NEW,
      operationalStatus: PulseOperationalStatus.ACTIVE,
    });
    const repository = new PulseConversationRepository(prisma as unknown as PrismaService);

    await repository.resolve({
      tenantId: 'tenant_a',
      channelId: 'channel_1',
      participantRef: '+15551234567',
      participantLabel: 'Customer',
      metadata: { source: 'entry' },
    });

    expect(prisma.pulseConversation.upsert).toHaveBeenCalledWith({
      where: {
        tenantId_channelId_participantRef: {
          tenantId: 'tenant_a',
          channelId: 'channel_1',
          participantRef: '+15551234567',
        },
      },
      create: expect.objectContaining({
        tenantId: 'tenant_a',
        channelId: 'channel_1',
        participantRef: '+15551234567',
        participantLabel: 'Customer',
        state: PulseConversationState.NEW,
        operationalStatus: PulseOperationalStatus.ACTIVE,
      }),
      update: expect.objectContaining({
        participantLabel: 'Customer',
        state: PulseConversationState.IN_FLOW,
        operationalStatus: PulseOperationalStatus.ACTIVE,
      }),
      select: {
        id: true,
        tenantId: true,
        channelId: true,
        participantRef: true,
        state: true,
        operationalStatus: true,
      },
    });
  });
});
