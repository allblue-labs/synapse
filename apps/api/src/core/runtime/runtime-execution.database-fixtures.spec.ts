import { ExecutionStatus } from '@prisma/client';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  databaseFixtureIds,
  describeDatabase,
  resetTenantFixtures,
  seedTwoTenants,
} from '../../testing/database-fixtures';
import { RuntimeExecutionLifecycleService } from './runtime-execution-lifecycle.service';

describeDatabase('Runtime execution database fixtures', () => {
  const ids = databaseFixtureIds('runtime');
  const tenantIds = [ids.tenantA, ids.tenantB];
  let prisma: PrismaService;
  let service: RuntimeExecutionLifecycleService;
  let connected = false;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    connected = true;
    await resetTenantFixtures(prisma, tenantIds);
    await seedTwoTenants(prisma, ids);
    const audit = new AuditService(prisma, { write: jest.fn() } as never);
    service = new RuntimeExecutionLifecycleService(prisma, audit);
  });

  beforeEach(async () => {
    await prisma.auditEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.executionRequest.deleteMany({ where: { tenantId: { in: tenantIds } } });
  });

  afterAll(async () => {
    if (connected) {
      await resetTenantFixtures(prisma, tenantIds);
      await prisma.$disconnect();
    }
  });

  it('scopes idempotency keys and reads by tenant', async () => {
    const tenantARequest = await service.request({
      context: { tenantId: ids.tenantA, moduleSlug: 'pulse', actorUserId: 'user-a' },
      requestType: 'pulse.flow.advance',
      idempotencyKey: 'same-key',
      input: { ticketId: 'ticket-a' },
    });
    const tenantBRequest = await service.request({
      context: { tenantId: ids.tenantB, moduleSlug: 'pulse', actorUserId: 'user-b' },
      requestType: 'pulse.flow.advance',
      idempotencyKey: 'same-key',
      input: { ticketId: 'ticket-b' },
    });

    expect(tenantARequest.id).not.toBe(tenantBRequest.id);
    await expect(service.get(ids.tenantB, tenantARequest.id)).rejects.toThrow(
      'Runtime execution request not found.',
    );

    await expect(service.get(ids.tenantA, tenantARequest.id)).resolves.toEqual(
      expect.objectContaining({
        id: tenantARequest.id,
        tenantId: ids.tenantA,
      }),
    );
  });

  it('blocks cross-tenant transitions and segregates audit records', async () => {
    const request = await service.request({
      context: { tenantId: ids.tenantA, moduleSlug: 'pulse', actorUserId: 'user-a' },
      requestType: 'pulse.flow.advance',
      input: { ticketId: 'ticket-a' },
    });

    await expect(
      service.transition({
        tenantId: ids.tenantB,
        executionId: request.id,
        status: ExecutionStatus.QUEUED,
        actorUserId: 'user-b',
      }),
    ).rejects.toThrow('Runtime execution request not found.');

    await service.transition({
      tenantId: ids.tenantA,
      executionId: request.id,
      status: ExecutionStatus.QUEUED,
      actorUserId: 'user-a',
    });
    await service.cancel({
      tenantId: ids.tenantA,
      executionId: request.id,
      actorUserId: 'user-a',
      reason: 'fixture cancellation',
    });

    await expect(
      prisma.executionRequest.findFirst({
        where: { tenantId: ids.tenantA, id: request.id },
      }),
    ).resolves.toEqual(expect.objectContaining({ status: ExecutionStatus.CANCELLED }));
    await expect(
      prisma.auditEvent.count({
        where: {
          tenantId: ids.tenantA,
          action: {
            in: [
              AuditAction.RUNTIME_EXECUTION_REQUESTED,
              AuditAction.RUNTIME_EXECUTION_TRANSITIONED,
              AuditAction.RUNTIME_EXECUTION_CANCELLED,
            ],
          },
        },
      }),
    ).resolves.toBe(3);
    await expect(
      prisma.auditEvent.count({ where: { tenantId: ids.tenantB } }),
    ).resolves.toBe(0);
  });

  it('rejects invalid terminal-state transitions without audit writes', async () => {
    const request = await service.request({
      context: { tenantId: ids.tenantA, moduleSlug: 'pulse', actorUserId: 'user-a' },
      requestType: 'pulse.flow.advance',
      input: { ticketId: 'ticket-a' },
    });
    await service.transition({
      tenantId: ids.tenantA,
      executionId: request.id,
      status: ExecutionStatus.FAILED,
      actorUserId: 'user-a',
    });

    await expect(
      service.transition({
        tenantId: ids.tenantA,
        executionId: request.id,
        status: ExecutionStatus.RUNNING,
        actorUserId: 'user-a',
      }),
    ).rejects.toThrow('Invalid runtime execution transition');

    await expect(
      prisma.auditEvent.count({
        where: {
          tenantId: ids.tenantA,
          action: AuditAction.RUNTIME_EXECUTION_TRANSITIONED,
        },
      }),
    ).resolves.toBe(1);
  });
});
