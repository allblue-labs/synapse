import { ConfigService } from '@nestjs/config';
import { ModuleCatalogStatus, ModuleRolloutState, ModuleTier, ModuleVisibility } from '@prisma/client';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import {
  databaseFixtureIds,
  describeDatabase,
  resetTenantFixtures,
  seedTwoTenants,
} from '../../testing/database-fixtures';
import { UsageMeteringService } from '../usage/usage-metering.service';
import { PlatformGovernanceService } from './platform-governance.service';
import { PlatformScopeService } from './platform-scope.service';

describeDatabase('Platform governance database fixtures', () => {
  const ids = databaseFixtureIds('platform-governance');
  const tenantIds = [ids.tenantA, ids.tenantB];
  const moduleSlugs = [`${ids.slugA}-pulse`, `${ids.slugA}-billing`];
  const policyKeys = [
    `${ids.slugA}.policy.pulse`,
    `${ids.slugA}.policy.billing`,
  ];
  const adminPulse: AuthenticatedUser = {
    sub: `${ids.slugA}-admin-pulse`,
    email: 'admin-pulse@synapse.local',
    role: 'admin',
  };
  const adminBilling: AuthenticatedUser = {
    sub: `${ids.slugA}-admin-billing`,
    email: 'admin-billing@synapse.local',
    role: 'admin',
  };

  let prisma: PrismaService;
  let service: PlatformGovernanceService;
  let connected = false;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    connected = true;

    await resetFixtures();
    await seedTwoTenants(prisma, ids);
    await seedPlatformUsers();
    await seedModulesAndPolicies();

    service = new PlatformGovernanceService(
      prisma,
      new UsageMeteringService(prisma, {} as ConfigService),
      new PlatformScopeService(prisma),
      new AuditService(prisma, { write: jest.fn() } as never),
    );
  });

  beforeEach(async () => {
    await prisma.auditEvent.deleteMany({
      where: { actorUserId: { in: [adminPulse.sub, adminBilling.sub] } },
    });
    await prisma.usageEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
  });

  afterAll(async () => {
    if (connected) {
      await resetFixtures();
      await prisma.$disconnect();
    }
  });

  it('loads persisted module scopes and filters platform module reads', async () => {
    await expect(service.modules(adminPulse, {})).resolves.toEqual([
      expect.objectContaining({ slug: moduleSlugs[0] }),
    ]);
    await expect(service.modules(adminBilling, {})).resolves.toEqual([
      expect.objectContaining({ slug: moduleSlugs[1] }),
    ]);
  });

  it('allows scoped module mutation and audits persisted previous/next state', async () => {
    await service.updateModuleGovernance(adminPulse, moduleSlugs[0], {
      rolloutState: ModuleRolloutState.GA,
    });

    await expect(
      prisma.moduleCatalogItem.findUnique({ where: { slug: moduleSlugs[0] } }),
    ).resolves.toEqual(expect.objectContaining({ rolloutState: ModuleRolloutState.GA }));
    await expect(
      prisma.auditEvent.count({
        where: {
          actorUserId: adminPulse.sub,
          action: AuditAction.PLATFORM_MODULE_GOVERNANCE_UPDATED,
          resourceType: 'ModuleCatalogItem',
        },
      }),
    ).resolves.toBe(1);
  });

  it('rejects out-of-scope module mutation and persists forbidden audit', async () => {
    await expect(
      service.updateModuleGovernance(adminPulse, moduleSlugs[1], { active: false }),
    ).rejects.toThrow('Platform modules scope is not assigned');

    await expect(
      prisma.auditEvent.count({
        where: {
          actorUserId: adminPulse.sub,
          action: AuditAction.AUTH_FORBIDDEN,
          resourceType: 'PlatformScope',
          resourceId: moduleSlugs[1],
        },
      }),
    ).resolves.toBe(1);
  });

  it('filters policies by persisted scopes and blocks out-of-scope writes', async () => {
    await expect(service.policies(adminPulse, {})).resolves.toEqual([
      expect.objectContaining({ key: policyKeys[0] }),
    ]);

    await service.updatePolicy(adminPulse, policyKeys[0], {
      enabled: false,
      metadata: { fixture: true },
    });
    await expect(
      prisma.billingFeatureFlag.findUnique({ where: { key: policyKeys[0] } }),
    ).resolves.toEqual(expect.objectContaining({ enabled: false }));

    await expect(
      service.updatePolicy(adminPulse, policyKeys[1], { enabled: false }),
    ).rejects.toThrow('Platform policies scope is not assigned');
    await expect(
      prisma.auditEvent.count({
        where: {
          actorUserId: adminPulse.sub,
          action: AuditAction.AUTH_FORBIDDEN,
          resourceType: 'PlatformScope',
          resourceId: policyKeys[1],
        },
      }),
    ).resolves.toBe(1);
  });

  it('aggregates usage metrics only for scoped modules and masks sensitive fields', async () => {
    await prisma.usageEvent.createMany({
      data: [
        {
          tenantId: ids.tenantA,
          moduleSlug: moduleSlugs[0],
          metricType: 'MESSAGE',
          quantity: '3',
          unit: 'message',
          billingPeriod: '2026-05',
          metadata: {},
        },
        {
          tenantId: ids.tenantA,
          moduleSlug: moduleSlugs[1],
          metricType: 'MESSAGE',
          quantity: '9',
          unit: 'message',
          billingPeriod: '2026-05',
          metadata: {},
        },
      ],
    });

    await expect(
      service.usageMetrics(adminPulse, { billingPeriod: '2026-05' }),
    ).resolves.toMatchObject({
      billingPeriod: '2026-05',
      moduleFilter: [moduleSlugs[0]],
      records: [
        expect.objectContaining({
          moduleSlug: moduleSlugs[0],
          quantity: '3',
          customerEmail: '[redacted]',
          revenueRaw: '[redacted]',
        }),
      ],
    });
  });

  async function seedPlatformUsers() {
    await prisma.user.createMany({
      data: [
        {
          id: adminPulse.sub,
          email: adminPulse.email,
          name: 'Pulse Scoped Admin',
          passwordHash: 'fixture-hash',
          platformRole: 'ADMIN',
          platformScopes: {
            metrics: ['usage'],
            modules: [moduleSlugs[0]],
            policies: [policyKeys[0]],
          },
        },
        {
          id: adminBilling.sub,
          email: adminBilling.email,
          name: 'Billing Scoped Admin',
          passwordHash: 'fixture-hash',
          platformRole: 'ADMIN',
          platformScopes: {
            metrics: ['usage'],
            modules: [moduleSlugs[1]],
            policies: [policyKeys[1]],
          },
        },
      ],
    });
  }

  async function seedModulesAndPolicies() {
    await Promise.all([
      prisma.moduleCatalogItem.create({
        data: moduleData(moduleSlugs[0], 'Pulse Fixture Module', policyKeys[0]),
      }),
      prisma.moduleCatalogItem.create({
        data: moduleData(moduleSlugs[1], 'Billing Fixture Module', policyKeys[1]),
      }),
      prisma.billingFeatureFlag.create({
        data: { key: policyKeys[0], enabled: true, metadata: { fixture: true } },
      }),
      prisma.billingFeatureFlag.create({
        data: { key: policyKeys[1], enabled: true, metadata: { fixture: true } },
      }),
    ]);
  }

  function moduleData(slug: string, displayName: string, featureFlag: string) {
    return {
      slug,
      displayName,
      version: '1.0.0',
      description: `${displayName} for database fixtures`,
      status: ModuleCatalogStatus.PUBLIC,
      tier: ModuleTier.PRO,
      visibility: ModuleVisibility.PUBLIC,
      rolloutState: ModuleRolloutState.PILOT,
      featureFlag,
      active: true,
      permissions: [],
      actions: [],
      events: [],
      metadata: { fixture: true },
    };
  }

  async function resetFixtures() {
    await prisma.auditEvent.deleteMany({
      where: { actorUserId: { in: [adminPulse.sub, adminBilling.sub] } },
    });
    await prisma.usageEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.billingFeatureFlag.deleteMany({ where: { key: { in: policyKeys } } });
    await prisma.moduleCatalogItem.deleteMany({ where: { slug: { in: moduleSlugs } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminPulse.sub, adminBilling.sub] } } });
    await resetTenantFixtures(prisma, tenantIds);
  }
});
