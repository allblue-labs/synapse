import {
  BillingPlanStatus,
  BillingStatus,
  ModuleCatalogStatus,
  ModulePurchaseStatus,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { BillingService } from './billing.service';

function createPrismaMock() {
  return {
    billingFeatureFlag: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    billingPlan: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    billingPlanModuleEntitlement: {
      upsert: jest.fn(),
    },
    billingAccount: {
      findUnique: jest.fn(),
    },
    moduleCatalogItem: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    modulePurchase: {
      findUnique: jest.fn(),
    },
  };
}

function createService() {
  const prisma = createPrismaMock();
  const audit = {
    record: jest.fn(),
  };
  return {
    prisma,
    audit,
    service: new BillingService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    ),
  };
}

describe('BillingService', () => {
  it('seeds Light, Pro, and Premium plans with commercial feature flags', async () => {
    const { service, prisma } = createService();
    prisma.billingFeatureFlag.upsert.mockResolvedValue({});
    prisma.billingPlan.upsert.mockResolvedValue({});

    await service.onModuleInit();

    expect(prisma.billingFeatureFlag.upsert).toHaveBeenCalledTimes(3);
    expect(prisma.billingPlan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'light' },
        create: expect.objectContaining({
          key: 'light',
          displayName: 'Light',
          status: BillingPlanStatus.ACTIVE,
          commercialFeatureFlag: 'billing.plan.light.commercial',
          requiredPublicModules: 1,
        }),
      }),
    );
    expect(prisma.billingPlan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'pro' },
        create: expect.objectContaining({ requiredPublicModules: 2 }),
      }),
    );
    expect(prisma.billingPlan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'premium' },
        create: expect.objectContaining({ requiredPublicModules: 3 }),
      }),
    );
  });

  it('allows active module purchases even without plan entitlement', async () => {
    const { service, prisma } = createService();
    prisma.moduleCatalogItem.findUnique.mockResolvedValue({
      id: 'module_pulse',
      status: ModuleCatalogStatus.PUBLIC,
    });
    prisma.modulePurchase.findUnique.mockResolvedValue({
      status: ModulePurchaseStatus.ACTIVE,
    });

    await expect(service.canEnableModule('tenant_a', 'pulse')).resolves.toBe(true);
    expect(prisma.billingAccount.findUnique).not.toHaveBeenCalled();
  });

  it('allows plan-entitled modules only when the plan is commercially active', async () => {
    const { service, prisma } = createService();
    prisma.moduleCatalogItem.findUnique.mockResolvedValue({
      id: 'module_pulse',
      status: ModuleCatalogStatus.PUBLIC,
    });
    prisma.modulePurchase.findUnique.mockResolvedValue(null);
    prisma.billingAccount.findUnique.mockResolvedValue({
      status: BillingStatus.ACTIVE,
      plan: {
        key: 'light',
        status: BillingPlanStatus.ACTIVE,
        moduleEntitlements: [{ id: 'entitlement_1' }],
      },
    });
    prisma.billingPlan.findUnique.mockResolvedValue({
      key: 'light',
      status: BillingPlanStatus.ACTIVE,
      commercialFeatureFlag: 'billing.plan.light.commercial',
      requiredPublicModules: 1,
    });
    prisma.billingFeatureFlag.findUnique.mockResolvedValue({ enabled: true });
    prisma.moduleCatalogItem.count.mockResolvedValue(1);

    await expect(service.canEnableModule('tenant_a', 'pulse')).resolves.toBe(true);
  });

  it('denies plan-entitled modules when the commercial flag is disabled', async () => {
    const { service, prisma } = createService();
    prisma.moduleCatalogItem.findUnique.mockResolvedValue({
      id: 'module_pulse',
      status: ModuleCatalogStatus.PUBLIC,
    });
    prisma.modulePurchase.findUnique.mockResolvedValue(null);
    prisma.billingAccount.findUnique.mockResolvedValue({
      status: BillingStatus.ACTIVE,
      plan: {
        key: 'pro',
        status: BillingPlanStatus.ACTIVE,
        moduleEntitlements: [{ id: 'entitlement_1' }],
      },
    });
    prisma.billingPlan.findUnique.mockResolvedValue({
      key: 'pro',
      status: BillingPlanStatus.ACTIVE,
      commercialFeatureFlag: 'billing.plan.pro.commercial',
      requiredPublicModules: 2,
    });
    prisma.billingFeatureFlag.findUnique.mockResolvedValue({ enabled: false });

    await expect(service.canEnableModule('tenant_a', 'pulse')).resolves.toBe(false);
  });

  it('denies plans without enough public modules to satisfy activation requirements', async () => {
    const { service, prisma } = createService();
    prisma.moduleCatalogItem.findUnique.mockResolvedValue({
      id: 'module_pulse',
      status: ModuleCatalogStatus.PUBLIC,
    });
    prisma.modulePurchase.findUnique.mockResolvedValue(null);
    prisma.billingAccount.findUnique.mockResolvedValue({
      status: BillingStatus.ACTIVE,
      plan: {
        key: 'premium',
        status: BillingPlanStatus.ACTIVE,
        moduleEntitlements: [{ id: 'entitlement_1' }],
      },
    });
    prisma.billingPlan.findUnique.mockResolvedValue({
      key: 'premium',
      status: BillingPlanStatus.ACTIVE,
      commercialFeatureFlag: 'billing.plan.premium.commercial',
      requiredPublicModules: 3,
    });
    prisma.billingFeatureFlag.findUnique.mockResolvedValue({ enabled: true });
    prisma.moduleCatalogItem.count.mockResolvedValue(1);

    await expect(service.canEnableModule('tenant_a', 'pulse')).resolves.toBe(false);
  });

  it('creates default Light entitlement for a module', async () => {
    const { service, prisma } = createService();
    prisma.moduleCatalogItem.findUnique.mockResolvedValue({ id: 'module_pulse' });
    prisma.billingPlan.findUnique.mockResolvedValue({ id: 'billing_plan_light' });
    prisma.billingPlanModuleEntitlement.upsert.mockResolvedValue({});

    await service.ensureDefaultModuleEntitlements('pulse');

    expect(prisma.billingPlanModuleEntitlement.upsert).toHaveBeenCalledWith({
      where: {
        planId_moduleId: {
          planId: 'billing_plan_light',
          moduleId: 'module_pulse',
        },
      },
      create: {
        planId: 'billing_plan_light',
        moduleId: 'module_pulse',
        included: true,
      },
      update: {
        included: true,
      },
    });
  });

  it('lists plans with commercial activation state', async () => {
    const { service, prisma } = createService();
    prisma.billingPlan.findMany.mockResolvedValue([
      {
        key: 'light',
        displayName: 'Light',
        status: BillingPlanStatus.ACTIVE,
        commercialFeatureFlag: 'billing.plan.light.commercial',
        requiredPublicModules: 1,
        entitlements: {},
        metadata: {},
      },
      {
        key: 'pro',
        displayName: 'Pro',
        status: BillingPlanStatus.ACTIVE,
        commercialFeatureFlag: 'billing.plan.pro.commercial',
        requiredPublicModules: 2,
        entitlements: {},
        metadata: {},
      },
    ]);
    prisma.moduleCatalogItem.count.mockResolvedValue(1);
    prisma.billingFeatureFlag.findMany.mockResolvedValue([
      { key: 'billing.plan.light.commercial', enabled: true },
      { key: 'billing.plan.pro.commercial', enabled: false },
    ]);

    await expect(service.listPlans()).resolves.toEqual([
      expect.objectContaining({
        key: 'light',
        commerciallyActive: true,
        publicModuleCount: 1,
      }),
      expect.objectContaining({
        key: 'pro',
        commerciallyActive: false,
        publicModuleCount: 1,
      }),
    ]);
  });

  it('updates billing feature flags and records audit events', async () => {
    const { service, prisma, audit } = createService();
    prisma.billingFeatureFlag.upsert.mockResolvedValue({
      id: 'flag_1',
      key: 'billing.plan.pro.commercial',
      enabled: true,
    });

    await service.setFeatureFlag('billing.plan.pro.commercial', true, {
      tenantId: 'tenant_a',
      userId: 'user_1',
    });

    expect(prisma.billingFeatureFlag.upsert).toHaveBeenCalledWith({
      where: { key: 'billing.plan.pro.commercial' },
      create: { key: 'billing.plan.pro.commercial', enabled: true },
      update: { enabled: true },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_a',
        actorUserId: 'user_1',
        action: AuditAction.BILLING_FEATURE_FLAG_UPDATED,
        resourceType: 'BillingFeatureFlag',
        resourceId: 'flag_1',
        metadata: {
          key: 'billing.plan.pro.commercial',
          enabled: true,
        },
      }),
    );
  });
});
