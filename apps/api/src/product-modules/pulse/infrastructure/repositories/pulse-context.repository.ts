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
import { PulseTenantTransaction, withPulseTenantContext } from './pulse-tenant-context';

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

    const [conversation, ticket, playbook, skill, knowledge, integrations, timeline] =
      await withPulseTenantContext(this.prisma, input.tenantId, (tx) => Promise.all([
        this.loadConversation(tx, input),
        this.loadTicket(tx, input),
        this.loadPlaybook(tx, input, skillType),
        tx.pulseSkill.findFirst({
          where: { tenantId: input.tenantId, type: skillType },
          select: {
            id: true,
            type: true,
            status: true,
            config: true,
            metadata: true,
          },
        }),
        tx.pulseKnowledgeContext.findMany({
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
        tx.integrationSetting.findMany({
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
        this.loadTimeline(tx, input),
      ]));

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

  private loadConversation(tx: PulseTenantTransaction, input: PulseContextAssemblyInput) {
    if (!input.conversationId) {
      return tx.pulseConversation.findFirst({
        where: {
          tenantId: input.tenantId,
          tickets: input.ticketId ? { some: { id: input.ticketId, tenantId: input.tenantId } } : undefined,
        },
        select: this.conversationSelect(),
        orderBy: [{ lastActivityAt: 'desc' }, { createdAt: 'desc' }],
      });
    }

    return tx.pulseConversation.findFirst({
      where: { tenantId: input.tenantId, id: input.conversationId },
      select: this.conversationSelect(),
    });
  }

  private loadTicket(tx: PulseTenantTransaction, input: PulseContextAssemblyInput) {
    if (!input.ticketId) {
      return tx.pulseTicket.findFirst({
        where: {
          tenantId: input.tenantId,
          ...(input.conversationId && { conversationId: input.conversationId }),
        },
        select: this.ticketSelect(),
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      });
    }

    return tx.pulseTicket.findFirst({
      where: { tenantId: input.tenantId, id: input.ticketId },
      select: this.ticketSelect(),
    });
  }

  private loadPlaybook(tx: PulseTenantTransaction, input: PulseContextAssemblyInput, skillType: PulseSkillType) {
    return tx.pulsePlaybook.findFirst({
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

  private loadTimeline(tx: PulseTenantTransaction, input: PulseContextAssemblyInput) {
    if (!input.conversationId && !input.ticketId) {
      return tx.pulseOperationalEvent.findMany({
        where: { tenantId: input.tenantId },
        select: this.timelineSelect(),
        orderBy: { occurredAt: 'desc' },
        take: 10,
      });
    }

    return tx.pulseOperationalEvent.findMany({
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
