import { Injectable } from '@nestjs/common';
import {
  IntegrationProvider,
  IntegrationStatus,
  Prisma,
  PulseKnowledgeContextStatus,
  PulseKnowledgeContextType,
  PulsePlaybookStatus,
  PulseSkillType,
} from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { PulseContextAssemblyInput } from '../../contracts/pulse.contracts';
import {
  IPulseContextRepository,
  PulseContextIntegrationRecord,
  PulseContextSourceData,
} from '../../domain/ports/pulse-context-repository.port';

const SCHEDULING_PROVIDERS = [
  IntegrationProvider.GOOGLE_CALENDAR,
  IntegrationProvider.OUTLOOK_CALENDAR,
  IntegrationProvider.CALENDLY,
] as const;

@Injectable()
export class PulseContextRepository implements IPulseContextRepository {
  constructor(private readonly prisma: PrismaService) {}

  async load(input: PulseContextAssemblyInput): Promise<PulseContextSourceData> {
    const skillType = input.skill as PulseSkillType;
    const knowledgeLimit = input.knowledgeLimit ?? 12;

    const [
      conversation,
      ticket,
      playbook,
      skill,
      knowledge,
      integrations,
      timeline,
    ] = await this.prisma.$transaction([
      this.loadConversation(input),
      this.loadTicket(input),
      this.loadPlaybook(input, skillType),
      this.prisma.pulseSkill.findFirst({
        where: { tenantId: input.tenantId, type: skillType },
        select: {
          id: true,
          type: true,
          status: true,
          config: true,
          metadata: true,
        },
      }),
      this.prisma.pulseKnowledgeContext.findMany({
        where: {
          tenantId: input.tenantId,
          status: PulseKnowledgeContextStatus.ACTIVE,
          type: {
            in: [
              PulseKnowledgeContextType.FAQ,
              PulseKnowledgeContextType.BUSINESS_DESCRIPTION,
              PulseKnowledgeContextType.OPERATIONAL_INSTRUCTION,
              PulseKnowledgeContextType.PRODUCT_SERVICE,
              PulseKnowledgeContextType.CAMPAIGN_PROMOTION,
            ],
          },
        },
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          metadata: true,
          updatedAt: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: knowledgeLimit,
      }),
      this.prisma.integrationSetting.findMany({
        where: {
          tenantId: input.tenantId,
          provider: { in: [...SCHEDULING_PROVIDERS] },
          status: {
            in: [
              IntegrationStatus.ACTIVE,
              IntegrationStatus.NEEDS_ATTENTION,
              IntegrationStatus.DISCONNECTED,
            ],
          },
        },
        select: {
          id: true,
          provider: true,
          status: true,
          displayName: true,
          settings: true,
          metadata: true,
          credentialsRef: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.loadTimeline(input),
    ]);

    return {
      conversation,
      ticket,
      playbook,
      skill,
      knowledge,
      integrations: integrations.map((integration) => this.toIntegrationRecord(integration)),
      timeline,
    };
  }

  private loadConversation(input: PulseContextAssemblyInput) {
    if (!input.conversationId) {
      return this.prisma.pulseConversation.findFirst({
        where: {
          tenantId: input.tenantId,
          tickets: input.ticketId ? { some: { id: input.ticketId, tenantId: input.tenantId } } : undefined,
        },
        select: this.conversationSelect(),
        orderBy: [{ lastActivityAt: 'desc' }, { createdAt: 'desc' }],
      });
    }

    return this.prisma.pulseConversation.findFirst({
      where: { tenantId: input.tenantId, id: input.conversationId },
      select: this.conversationSelect(),
    });
  }

  private loadTicket(input: PulseContextAssemblyInput) {
    if (!input.ticketId) {
      return this.prisma.pulseTicket.findFirst({
        where: {
          tenantId: input.tenantId,
          ...(input.conversationId && { conversationId: input.conversationId }),
        },
        select: this.ticketSelect(),
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      });
    }

    return this.prisma.pulseTicket.findFirst({
      where: { tenantId: input.tenantId, id: input.ticketId },
      select: this.ticketSelect(),
    });
  }

  private loadPlaybook(input: PulseContextAssemblyInput, skillType: PulseSkillType) {
    return this.prisma.pulsePlaybook.findFirst({
      where: {
        tenantId: input.tenantId,
        status: PulsePlaybookStatus.ACTIVE,
        ...(input.playbookKey ? { key: input.playbookKey } : { skill: skillType }),
      },
      select: {
        id: true,
        key: true,
        name: true,
        status: true,
        skill: true,
        flow: true,
        metadata: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private loadTimeline(input: PulseContextAssemblyInput) {
    if (!input.conversationId && !input.ticketId) {
      return this.prisma.pulseOperationalEvent.findMany({
        where: { tenantId: input.tenantId },
        select: this.timelineSelect(),
        orderBy: { occurredAt: 'desc' },
        take: 10,
      });
    }

    return this.prisma.pulseOperationalEvent.findMany({
      where: {
        tenantId: input.tenantId,
        OR: [
          ...(input.conversationId ? [{ conversationId: input.conversationId }] : []),
          ...(input.ticketId ? [{ ticketId: input.ticketId }] : []),
        ],
      },
      select: this.timelineSelect(),
      orderBy: { occurredAt: 'desc' },
      take: 20,
    });
  }

  private conversationSelect() {
    return {
      id: true,
      tenantId: true,
      channelId: true,
      participantRef: true,
      participantLabel: true,
      state: true,
      operationalStatus: true,
      confidence: true,
      lastActivityAt: true,
      metadata: true,
      channel: {
        select: {
          id: true,
          provider: true,
          identifier: true,
          status: true,
          limits: true,
          metadata: true,
        },
      },
    } satisfies Prisma.PulseConversationSelect;
  }

  private ticketSelect() {
    return {
      id: true,
      tenantId: true,
      conversationId: true,
      type: true,
      status: true,
      title: true,
      summary: true,
      priority: true,
      confidence: true,
      assignedUserId: true,
      metadata: true,
      resolvedAt: true,
      updatedAt: true,
    } satisfies Prisma.PulseTicketSelect;
  }

  private timelineSelect() {
    return {
      id: true,
      eventType: true,
      actorType: true,
      actorUserId: true,
      channelId: true,
      conversationId: true,
      ticketId: true,
      payload: true,
      metadata: true,
      occurredAt: true,
    } satisfies Prisma.PulseOperationalEventSelect;
  }

  private toIntegrationRecord(
    integration: Prisma.IntegrationSettingGetPayload<{
      select: {
        id: true;
        provider: true;
        status: true;
        displayName: true;
        settings: true;
        metadata: true;
        credentialsRef: true;
      };
    }>,
  ): PulseContextIntegrationRecord {
    return {
      id: integration.id,
      provider: integration.provider,
      status: integration.status,
      displayName: integration.displayName,
      settings: integration.settings,
      metadata: integration.metadata,
      credentialsConfigured: Boolean(integration.credentialsRef),
    };
  }
}
