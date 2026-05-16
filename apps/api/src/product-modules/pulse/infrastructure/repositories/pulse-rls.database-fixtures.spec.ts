import {
  IntegrationProvider,
  IntegrationStatus,
  PulseChannelProvider,
  PulseChannelStatus,
  PulseKnowledgeContextType,
  PulseTicketStatus,
  PulseTicketType,
} from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  databaseFixtureIds,
  describeDatabase,
  resetTenantFixtures,
  seedTwoTenants,
} from '../../../../testing/database-fixtures';
import { PulseOperationalScheduleService } from '../../application/services/pulse-operational-schedule.service';
import { PulseChannelRepository } from './pulse-channel.repository';
import { PulseConversationRepository } from './pulse-conversation.repository';
import { PulseIntegrationSettingRepository } from './pulse-integration-setting.repository';
import { PulseKnowledgeContextRepository } from './pulse-knowledge-context.repository';
import { PulseOperationalEventRepository } from './pulse-operational-event.repository';
import { PulseTicketRepository } from './pulse-ticket.repository';

describeDatabase('Pulse RLS database fixtures', () => {
  const ids = databaseFixtureIds('pulse-rls');
  const tenantIds = [ids.tenantA, ids.tenantB];

  let prisma: PrismaService;
  let connected = false;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    connected = true;
    await resetTenantFixtures(prisma, tenantIds);
    await seedTwoTenants(prisma, ids);
  });

  afterAll(async () => {
    if (connected) {
      await resetTenantFixtures(prisma, tenantIds);
      await prisma.$disconnect();
    }
  });

  it('enforces tenant visibility on pulse tickets through database RLS', async () => {
    const repository = new PulseTicketRepository(prisma);
    const ticket = await repository.create({
      tenantId: ids.tenantA,
      type: PulseTicketType.SUPPORT,
      status: PulseTicketStatus.OPEN,
      title: 'Tenant A RLS ticket',
      metadata: { fixture: 'rls' },
    });

    await expect(repository.findById(ids.tenantA, ticket.id)).resolves.toEqual(
      expect.objectContaining({ id: ticket.id, tenantId: ids.tenantA }),
    );
    await expect(repository.findById(ids.tenantB, ticket.id)).resolves.toBeNull();

    await expect(
      prisma.pulseTicket.findFirst({
        where: { id: ticket.id },
      }),
    ).resolves.toBeNull();

    await expect(
      prisma.withTenantContext(ids.tenantA, (tx) =>
        tx.pulseTicket.create({
          data: {
            tenantId: ids.tenantB,
            type: PulseTicketType.SUPPORT,
            status: PulseTicketStatus.OPEN,
            title: 'Tenant B ticket through Tenant A context',
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it('enforces tenant visibility across Pulse conversation and timeline tables', async () => {
    const channels = new PulseChannelRepository(prisma);
    const conversations = new PulseConversationRepository(prisma);
    const events = new PulseOperationalEventRepository(prisma);

    const channel = await channels.upsert({
      tenantId: ids.tenantA,
      provider: PulseChannelProvider.WHATSAPP,
      identifier: '+15550000001',
      status: PulseChannelStatus.ACTIVE,
    });
    const conversation = await conversations.resolve({
      tenantId: ids.tenantA,
      channelId: channel.id,
      participantRef: 'customer-a',
      participantLabel: 'Customer A',
    });
    const event = await events.record({
      tenantId: ids.tenantA,
      eventType: 'pulse.rls.fixture',
      channelId: channel.id,
      conversationId: conversation.id,
      payload: { fixture: true },
    });

    await expect(channels.findById(ids.tenantB, channel.id)).resolves.toBeNull();
    await expect(conversations.findById(ids.tenantB, conversation.id)).resolves.toBeNull();
    await expect(events.listForConversation(ids.tenantB, conversation.id)).resolves.toMatchObject({ total: 0 });
    await expect(
      prisma.pulseOperationalEvent.findFirst({ where: { id: event.id } }),
    ).resolves.toBeNull();
  });

  it('enforces tenant visibility for Pulse knowledge, schedules, and integrations', async () => {
    const knowledge = new PulseKnowledgeContextRepository(prisma);
    const integrations = new PulseIntegrationSettingRepository(prisma);
    const schedules = new PulseOperationalScheduleService(prisma);

    const knowledgeRecord = await knowledge.publish({
      tenantId: ids.tenantA,
      type: PulseKnowledgeContextType.FAQ,
      title: 'Tenant A FAQ',
      content: 'Only Tenant A can read this.',
      metadata: { fixture: true },
    });
    const { integrationId } = await prisma.withTenantContext(ids.tenantA, async (tx) => {
      await tx.pulseOperationalSchedule.create({
        data: {
          tenantId: ids.tenantA,
          timezone: 'UTC',
          operationalPause: true,
          pauseReason: 'rls_fixture',
          closedMessage: 'Closed for fixture.',
        },
      });
      const integration = await tx.integrationSetting.create({
        data: {
          tenantId: ids.tenantA,
          provider: IntegrationProvider.GOOGLE_CALENDAR,
          status: IntegrationStatus.ACTIVE,
          displayName: 'Tenant A Google Calendar',
          externalRef: 'tenant-a-calendar',
        },
      });
      return { integrationId: integration.id };
    });

    await expect(knowledge.findById(ids.tenantB, knowledgeRecord.id)).resolves.toBeNull();
    await expect(integrations.findById(ids.tenantB, integrationId)).resolves.toBeNull();
    await expect(schedules.decide(ids.tenantB)).resolves.toEqual({ open: true });
    await expect(schedules.decide(ids.tenantA)).resolves.toMatchObject({
      open: false,
      reason: 'rls_fixture',
      closedMessage: 'Closed for fixture.',
    });
    await expect(
      prisma.pulseKnowledgeContext.findFirst({ where: { id: knowledgeRecord.id } }),
    ).resolves.toBeNull();
  });
});
