import { ConfigService } from '@nestjs/config';
import { PulseTicketStatus, PulseTicketType } from '@prisma/client';
import { AuditService } from '../../../../common/audit/audit.service';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user';
import { UsageMeteringService } from '../../../../modules/usage/usage-metering.service';
import {
  databaseFixtureIds,
  describeDatabase,
  resetTenantFixtures,
  seedTwoTenants,
} from '../../../../testing/database-fixtures';
import { PULSE_EVENT_TYPES } from '../../domain/pulse-event-types';
import { PulseOperationalEventRepository } from '../../infrastructure/repositories/pulse-operational-event.repository';
import { PulseTicketRepository } from '../../infrastructure/repositories/pulse-ticket.repository';
import { TicketLifecycleUseCase } from './ticket-lifecycle.use-case';

describeDatabase('Pulse ticket lifecycle database fixtures', () => {
  const ids = databaseFixtureIds('pulse-ticket-lifecycle');
  const tenantIds = [ids.tenantA, ids.tenantB];
  const actor: AuthenticatedUser = {
    sub: 'operator-a',
    tenantId: ids.tenantA,
    role: 'OPERATOR',
    email: 'operator-a@synapse.local',
  };

  let prisma: PrismaService;
  let lifecycle: TicketLifecycleUseCase;
  let connected = false;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    connected = true;
    await resetTenantFixtures(prisma, tenantIds);
    await seedTwoTenants(prisma, ids);
    lifecycle = new TicketLifecycleUseCase(
      new PulseTicketRepository(prisma),
      new PulseOperationalEventRepository(prisma),
      new AuditService(prisma, { write: jest.fn() } as never),
      new UsageMeteringService(prisma, {} as ConfigService),
      prisma,
    );
  });

  beforeEach(async () => {
    await prisma.auditEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.usageEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.pulseActionExecution.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.pulseOperationalEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.pulseTicket.deleteMany({ where: { tenantId: { in: tenantIds } } });
  });

  afterAll(async () => {
    if (connected) {
      await resetTenantFixtures(prisma, tenantIds);
      await prisma.$disconnect();
    }
  });

  it('mutates only tenant-owned tickets and segregates events, audit, and usage', async () => {
    const [ticketA] = await Promise.all([
      prisma.pulseTicket.create({
        data: {
          tenantId: ids.tenantA,
          type: PulseTicketType.SUPPORT,
          status: PulseTicketStatus.OPEN,
          title: 'Tenant A support ticket',
        },
      }),
      prisma.pulseTicket.create({
        data: {
          tenantId: ids.tenantB,
          type: PulseTicketType.SUPPORT,
          status: PulseTicketStatus.OPEN,
          title: 'Tenant B support ticket',
        },
      }),
    ]);

    await expect(
      lifecycle.assignTicket(ids.tenantB, ticketA.id, actor, {
        assignedUserId: 'operator-b',
      }),
    ).rejects.toThrow('Pulse ticket not found.');

    await lifecycle.assignTicket(ids.tenantA, ticketA.id, actor, {
      assignedUserId: 'operator-a',
      note: 'fixture assignment',
    });

    await expect(
      prisma.pulseTicket.findFirst({ where: { tenantId: ids.tenantA, id: ticketA.id } }),
    ).resolves.toEqual(expect.objectContaining({ assignedUserId: 'operator-a' }));
    await expect(
      prisma.pulseOperationalEvent.count({
        where: {
          tenantId: ids.tenantA,
          ticketId: ticketA.id,
          eventType: PULSE_EVENT_TYPES.TICKET_ASSIGN,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.auditEvent.count({
        where: {
          tenantId: ids.tenantA,
          resourceType: 'PulseTicket',
          resourceId: ticketA.id,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.usageEvent.count({
        where: {
          tenantId: ids.tenantA,
          resourceType: 'PulseTicket',
          resourceId: ticketA.id,
          unit: 'ticket_operation',
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.pulseOperationalEvent.count({
        where: { tenantId: ids.tenantB, ticketId: ticketA.id },
      }),
    ).resolves.toBe(0);
  });

  it('rejects terminal ticket mutations before events, audit, or usage writes', async () => {
    const ticket = await prisma.pulseTicket.create({
      data: {
        tenantId: ids.tenantA,
        type: PulseTicketType.SUPPORT,
        status: PulseTicketStatus.RESOLVED,
        title: 'Resolved tenant A ticket',
        resolvedAt: new Date(),
      },
    });

    await expect(
      lifecycle.cancelTicket(ids.tenantA, ticket.id, actor, {
        reason: 'should not mutate terminal tickets',
      }),
    ).rejects.toThrow('Cannot cancel a terminal ticket.');

    await expect(
      prisma.pulseOperationalEvent.count({ where: { tenantId: ids.tenantA, ticketId: ticket.id } }),
    ).resolves.toBe(0);
    await expect(
      prisma.auditEvent.count({ where: { tenantId: ids.tenantA, resourceId: ticket.id } }),
    ).resolves.toBe(0);
    await expect(
      prisma.usageEvent.count({ where: { tenantId: ids.tenantA, resourceId: ticket.id } }),
    ).resolves.toBe(0);
  });

  it('does not reapply duplicate action idempotency keys for flow advancement', async () => {
    const actionIdempotencyKey = `pulse.actions:${ids.tenantA}:exec-1:ticket.advance_flow:ticket-1`;
    const ticket = await prisma.pulseTicket.create({
      data: {
        tenantId: ids.tenantA,
        type: PulseTicketType.SUPPORT,
        status: PulseTicketStatus.OPEN,
        title: 'Tenant A flow ticket',
        metadata: { flowState: 'intake' },
      },
    });

    await lifecycle.advanceFlowState(ids.tenantA, ticket.id, actor, {
      nextState: 'collect_context',
      transitionSource: 'ai',
      confidence: 0.92,
      actionIdempotencyKey,
    });
    await lifecycle.advanceFlowState(ids.tenantA, ticket.id, actor, {
      nextState: 'execute_action',
      transitionSource: 'ai',
      confidence: 0.95,
      actionIdempotencyKey,
    });

    const updated = await prisma.pulseTicket.findFirstOrThrow({
      where: { tenantId: ids.tenantA, id: ticket.id },
    });
    expect(updated.metadata).toEqual(expect.objectContaining({
      flowState: 'collect_context',
      actionIdempotencyKeys: expect.objectContaining({
        [actionIdempotencyKey]: expect.objectContaining({
          action: 'advance_flow_state',
        }),
      }),
    }));
    await expect(
      prisma.pulseOperationalEvent.count({
        where: {
          tenantId: ids.tenantA,
          ticketId: ticket.id,
          eventType: PULSE_EVENT_TYPES.TICKET_FLOW_ADVANCE,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.auditEvent.count({
        where: {
          tenantId: ids.tenantA,
          resourceType: 'PulseTicket',
          resourceId: ticket.id,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.usageEvent.count({
        where: {
          tenantId: ids.tenantA,
          resourceType: 'PulseTicket',
          resourceId: ticket.id,
          idempotencyKey: `pulse-ticket-advance_flow_state:${ticket.id}:${actionIdempotencyKey}`,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.pulseActionExecution.count({
        where: {
          tenantId: ids.tenantA,
          idempotencyKey: actionIdempotencyKey,
          status: 'SUCCEEDED',
        },
      }),
    ).resolves.toBe(1);
  });
});
