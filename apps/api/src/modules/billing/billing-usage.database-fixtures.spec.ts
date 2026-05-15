import { ConfigService } from '@nestjs/config';
import { BillingPlanStatus, BillingStatus, ModuleTier, UsageMetricType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import {
  databaseFixtureIds,
  describeDatabase,
  resetTenantFixtures,
  seedTwoTenants,
} from '../../testing/database-fixtures';
import { BillingService } from './billing.service';

describeDatabase('Billing usage database fixtures', () => {
  const ids = databaseFixtureIds('billing-usage');
  const tenantIds = [ids.tenantA, ids.tenantB];
  const planKey = `db-billing-usage-${process.pid}`;

  let prisma: PrismaService;
  let billing: BillingService;
  let connected = false;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    connected = true;

    await resetTenantFixtures(prisma, tenantIds);
    await prisma.billingPlan.deleteMany({ where: { key: planKey } });
    await seedTwoTenants(prisma, ids);

    await prisma.billingPlan.create({
      data: {
        key: planKey,
        displayName: 'DB Fixture Usage Plan',
        status: BillingPlanStatus.ACTIVE,
        entitlements: {
          allowedModuleTiers: [ModuleTier.FREE, ModuleTier.LIGHT],
          quotas: {
            maxTenants: 2,
            monthlyCredits: 1,
            maxUsersPerTenant: 3,
            maxModules: 3,
            maxActiveChannelSets: 1,
          },
          custom: {},
        },
      },
    });

    await prisma.billingAccount.createMany({
      data: tenantIds.map((tenantId) => ({
        tenantId,
        planKey,
        status: BillingStatus.ACTIVE,
      })),
    });

    billing = new BillingService(
      prisma,
      new AuditService(prisma, { write: jest.fn() } as never),
      { get: jest.fn() } as unknown as ConfigService,
      undefined,
    );
  });

  beforeEach(async () => {
    await prisma.usageEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
  });

  afterAll(async () => {
    if (connected) {
      await resetTenantFixtures(prisma, tenantIds);
      await prisma.billingPlan.deleteMany({ where: { key: planKey } });
      await prisma.$disconnect();
    }
  });

  it('does not re-check exhausted quota for an existing idempotent usage event', async () => {
    const input = {
      tenantId: ids.tenantA,
      moduleSlug: 'pulse',
      metricType: UsageMetricType.WORKFLOW_RUN,
      quantity: 1,
      unit: 'workflow_run',
      resourceType: 'PulseAction',
      resourceId: 'ticket-a',
      idempotencyKey: 'pulse-action-usage:same-job',
      credits: 1,
      metadata: { action: 'ticket.advance_flow' },
    };

    await billing.consumeUsageOrReject(input);
    await expect(billing.consumeUsageOrReject(input)).resolves.toEqual(expect.objectContaining({
      tenantId: ids.tenantA,
      idempotencyKey: input.idempotencyKey,
    }));

    await expect(
      prisma.usageEvent.count({
        where: {
          tenantId: ids.tenantA,
          idempotencyKey: input.idempotencyKey,
        },
      }),
    ).resolves.toBe(1);
  });

  it('keeps idempotency keys tenant-scoped', async () => {
    const sharedIdempotencyKey = 'pulse-action-usage:shared-job';

    await billing.consumeUsageOrReject({
      tenantId: ids.tenantA,
      moduleSlug: 'pulse',
      metricType: UsageMetricType.WORKFLOW_RUN,
      quantity: 1,
      unit: 'workflow_run',
      resourceType: 'PulseAction',
      resourceId: 'ticket-a',
      idempotencyKey: sharedIdempotencyKey,
      credits: 1,
    });
    await billing.consumeUsageOrReject({
      tenantId: ids.tenantB,
      moduleSlug: 'pulse',
      metricType: UsageMetricType.WORKFLOW_RUN,
      quantity: 1,
      unit: 'workflow_run',
      resourceType: 'PulseAction',
      resourceId: 'ticket-b',
      idempotencyKey: sharedIdempotencyKey,
      credits: 1,
    });

    await expect(
      prisma.usageEvent.count({
        where: { idempotencyKey: sharedIdempotencyKey },
      }),
    ).resolves.toBe(2);
    await expect(
      prisma.usageEvent.count({
        where: { tenantId: ids.tenantA, idempotencyKey: sharedIdempotencyKey },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.usageEvent.count({
        where: { tenantId: ids.tenantB, idempotencyKey: sharedIdempotencyKey },
      }),
    ).resolves.toBe(1);
  });
});
