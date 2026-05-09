import {
  IntegrationProvider,
  IntegrationStatus,
  PulseChannelProvider,
  PulseChannelStatus,
  PulseConversationState,
  PulseOperationalStatus,
  PulseTicketStatus,
  PulseTicketType,
} from '@prisma/client';
import { PulseContextRepository } from './pulse-context.repository';

describe('PulseContextRepository', () => {
  const prisma = {
    $transaction: jest.fn(),
    pulseConversation: { findFirst: jest.fn() },
    pulseTicket: { findFirst: jest.fn() },
    pulsePlaybook: { findFirst: jest.fn() },
    pulseSkill: { findFirst: jest.fn() },
    pulseKnowledgeContext: { findMany: jest.fn() },
    integrationSetting: { findMany: jest.fn() },
    pulseOperationalEvent: { findMany: jest.fn() },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (operations: unknown[]) => operations);
  });

  it('uses tenant filters for every context query and never returns credential references', async () => {
    const conversation = {
      id: 'conversation-1',
      tenantId: 'tenant-1',
      channelId: 'channel-1',
      participantRef: 'participant',
      participantLabel: null,
      state: PulseConversationState.IN_FLOW,
      operationalStatus: PulseOperationalStatus.ACTIVE,
      confidence: null,
      lastActivityAt: null,
      metadata: {},
      channel: {
        id: 'channel-1',
        provider: PulseChannelProvider.WHATSAPP,
        identifier: 'identifier',
        status: PulseChannelStatus.ACTIVE,
        limits: {},
        metadata: {},
      },
    };
    const ticket = {
      id: 'ticket-1',
      tenantId: 'tenant-1',
      conversationId: 'conversation-1',
      type: PulseTicketType.SUPPORT,
      status: PulseTicketStatus.OPEN,
      title: 'Support',
      summary: null,
      priority: 0,
      confidence: null,
      assignedUserId: null,
      metadata: {},
      resolvedAt: null,
      updatedAt: new Date(),
    };
    const integration = {
      id: 'integration-1',
      provider: IntegrationProvider.GOOGLE_CALENDAR,
      status: IntegrationStatus.ACTIVE,
      displayName: 'Calendar',
      settings: {},
      metadata: {},
      credentialsRef: 'vault://secret',
    };

    prisma.pulseConversation.findFirst.mockReturnValue(conversation);
    prisma.pulseTicket.findFirst.mockReturnValue(ticket);
    prisma.pulsePlaybook.findFirst.mockReturnValue(null);
    prisma.pulseSkill.findFirst.mockReturnValue(null);
    prisma.pulseKnowledgeContext.findMany.mockReturnValue([]);
    prisma.integrationSetting.findMany.mockReturnValue([integration]);
    prisma.pulseOperationalEvent.findMany.mockReturnValue([]);

    const repository = new PulseContextRepository(prisma as never);
    const source = await repository.load({
      tenantId: 'tenant-1',
      skill: 'SUPPORT',
      executionType: 'classify_intent',
      conversationId: 'conversation-1',
      ticketId: 'ticket-1',
    });

    expect(prisma.pulseConversation.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: 'tenant-1', id: 'conversation-1' },
    }));
    expect(prisma.pulseTicket.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: 'tenant-1', id: 'ticket-1' },
    }));
    expect(prisma.pulseKnowledgeContext.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-1' }),
    }));
    expect(prisma.integrationSetting.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-1' }),
    }));
    expect(source.integrations).toEqual([
      expect.not.objectContaining({ credentialsRef: 'vault://secret' }),
    ]);
    expect(source.integrations[0]).toMatchObject({
      credentialsConfigured: true,
    });
  });
});
