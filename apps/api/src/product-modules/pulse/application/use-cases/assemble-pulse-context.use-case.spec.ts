import { NotFoundException } from '@nestjs/common';
import {
  IntegrationProvider,
  IntegrationStatus,
  PulseChannelProvider,
  PulseChannelStatus,
  PulseConversationState,
  PulseKnowledgeContextType,
  PulseOperationalStatus,
  PulseTicketStatus,
  PulseTicketType,
} from '@prisma/client';
import { AssemblePulseContextUseCase } from './assemble-pulse-context.use-case';
import { IPulseContextRepository } from '../../domain/ports/pulse-context-repository.port';

describe('AssemblePulseContextUseCase', () => {
  const repository: jest.Mocked<IPulseContextRepository> = {
    load: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('assembles an audit-safe tenant-scoped Pulse context pack', async () => {
    repository.load.mockResolvedValue({
      conversation: {
        id: 'conversation-1',
        tenantId: 'tenant-1',
        channelId: 'channel-1',
        participantRef: '+5581999999999',
        participantLabel: 'Customer',
        state: PulseConversationState.IN_FLOW,
        operationalStatus: PulseOperationalStatus.ACTIVE,
        confidence: 0.82,
        lastActivityAt: new Date('2026-05-09T12:00:00.000Z'),
        metadata: { summary: 'Needs scheduling', rawMessage: 'secret text' },
        channel: {
          id: 'channel-1',
          provider: PulseChannelProvider.WHATSAPP,
          identifier: '+5581888888888',
          status: PulseChannelStatus.ACTIVE,
          limits: { daily: 100 },
          metadata: { token: 'provider-token' },
        },
      },
      ticket: {
        id: 'ticket-1',
        tenantId: 'tenant-1',
        conversationId: 'conversation-1',
        type: PulseTicketType.SCHEDULING,
        status: PulseTicketStatus.OPEN,
        title: 'Schedule visit',
        summary: 'Customer wants a slot',
        priority: 10,
        confidence: 0.8,
        assignedUserId: null,
        metadata: { flowState: 'collect_context', prompt: 'do not expose' },
        resolvedAt: null,
        updatedAt: new Date('2026-05-09T12:01:00.000Z'),
      },
      playbook: null,
      skill: null,
      knowledge: [
        {
          id: 'knowledge-1',
          type: PulseKnowledgeContextType.FAQ,
          title: 'Hours',
          content: 'Open weekdays.',
          metadata: { source: 'manual' },
          updatedAt: new Date('2026-05-09T11:00:00.000Z'),
        },
        {
          id: 'product-1',
          type: PulseKnowledgeContextType.PRODUCT_SERVICE,
          title: 'Consulting',
          content: 'Implementation service.',
          metadata: {},
          updatedAt: new Date('2026-05-09T11:30:00.000Z'),
        },
      ],
      integrations: [
        {
          id: 'integration-1',
          provider: IntegrationProvider.GOOGLE_CALENDAR,
          status: IntegrationStatus.ACTIVE,
          displayName: 'Main calendar',
          settings: { timezone: 'America/Recife', apiKey: 'secret' },
          metadata: {},
          credentialsConfigured: true,
        },
      ],
      timeline: [],
    });

    const useCase = new AssemblePulseContextUseCase(repository);
    const context = await useCase.execute({
      tenantId: 'tenant-1',
      skill: 'SCHEDULER',
      executionType: 'schedule_action',
      conversationId: 'conversation-1',
      ticketId: 'ticket-1',
    });

    expect(repository.load).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      conversationId: 'conversation-1',
      ticketId: 'ticket-1',
    }));
    expect(context.module).toBe('pulse');
    expect(context.workspaceId).toBe('tenant-1');
    expect(context.conversationState?.participantRef).toBe('**********9999');
    expect(context.ticketState?.metadata).toMatchObject({ prompt: '[REDACTED]' });
    expect(context.schedulingContext).toMatchObject({
      providers: [
        expect.objectContaining({
          credentialsConfigured: true,
          settings: { timezone: 'America/Recife', apiKey: '[REDACTED]' },
        }),
      ],
    });
    expect(context.allowedActions).toContain('ticket.advance_flow');
    expect(context.securityHints.join(' ')).toContain('chain-of-thought');
  });

  it('rejects cross-tenant or missing requested conversation context', async () => {
    repository.load.mockResolvedValue({
      conversation: null,
      ticket: null,
      playbook: null,
      skill: null,
      knowledge: [],
      integrations: [],
      timeline: [],
    });

    const useCase = new AssemblePulseContextUseCase(repository);

    await expect(useCase.execute({
      tenantId: 'tenant-a',
      skill: 'SUPPORT',
      executionType: 'classify_intent',
      conversationId: 'conversation-from-tenant-b',
    })).rejects.toBeInstanceOf(NotFoundException);
  });
});
