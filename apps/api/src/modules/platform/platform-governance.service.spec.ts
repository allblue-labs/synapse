import { ForbiddenException } from '@nestjs/common';
import { AuditAction } from '../../common/audit/audit.service';
import { PlatformGovernanceService } from './platform-governance.service';

describe('PlatformGovernanceService scope/audit behavior', () => {
  const actor = {
    sub: 'admin_1',
    email: 'admin@example.com',
    role: 'admin' as const,
  };

  const prisma = {
    moduleCatalogItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    billingFeatureFlag: {
      upsert: jest.fn(),
    },
    usageEvent: {
      groupBy: jest.fn(),
    },
    tenant: {
      findMany: jest.fn(),
    },
  };
  const usage = {
    billingPeriodFor: jest.fn(),
  };
  const scopes = {
    scopesFor: jest.fn(),
    assertAllowed: jest.fn(),
    filterRequested: jest.fn(),
  };
  const audit = {
    record: jest.fn(),
  };

  let service: PlatformGovernanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlatformGovernanceService(
      prisma as never,
      usage as never,
      scopes as never,
      audit as never,
    );
  });

  it('updates module governance and audits previous/next state when scope allows it', async () => {
    scopes.scopesFor.mockResolvedValue({ metrics: [], modules: ['pulse'], policies: [] });
    scopes.assertAllowed.mockReturnValue(undefined);
    prisma.moduleCatalogItem.findUnique.mockResolvedValue({
      id: 'module_1',
      slug: 'pulse',
      active: true,
      storeVisible: true,
      status: 'PUBLIC',
      visibility: 'PUBLIC',
      rolloutState: 'PILOT',
      tier: 'PRO',
    });
    prisma.moduleCatalogItem.update.mockResolvedValue({
      id: 'module_1',
      slug: 'pulse',
      displayName: 'Pulse',
      active: true,
      storeVisible: true,
      status: 'PUBLIC',
      visibility: 'PUBLIC',
      rolloutState: 'GA',
      tier: 'PRO',
      updatedAt: new Date('2026-05-08T12:00:00.000Z'),
    });

    await expect(
      service.updateModuleGovernance(actor, 'pulse', { rolloutState: 'GA' as never }),
    ).resolves.toMatchObject({
      slug: 'pulse',
      rolloutState: 'GA',
      updatedAt: '2026-05-08T12:00:00.000Z',
    });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: AuditAction.PLATFORM_MODULE_GOVERNANCE_UPDATED,
      resourceId: 'module_1',
      metadata: expect.objectContaining({
        slug: 'pulse',
        previous: expect.objectContaining({ rolloutState: 'PILOT' }),
        next: expect.objectContaining({ rolloutState: 'GA' }),
      }),
    }));
  });

  it('allows only super_admin to change module store visibility', async () => {
    scopes.scopesFor.mockResolvedValue({ metrics: [], modules: ['pulse'], policies: [] });
    scopes.assertAllowed.mockReturnValue(undefined);
    prisma.moduleCatalogItem.findUnique.mockResolvedValue({
      id: 'module_1',
      slug: 'pulse',
      active: true,
      storeVisible: true,
      status: 'PUBLIC',
      visibility: 'PUBLIC',
      rolloutState: 'GA',
      tier: 'PRO',
    });

    await expect(
      service.updateModuleGovernance(actor, 'pulse', { storeVisible: false }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.moduleCatalogItem.update).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: AuditAction.AUTH_FORBIDDEN,
      resourceType: 'ModuleCatalogItem',
      resourceId: 'pulse',
      metadata: expect.objectContaining({
        field: 'storeVisible',
        reason: 'super_admin_required',
      }),
    }));
  });

  it('audits and rejects module governance mutations outside assigned scope', async () => {
    scopes.scopesFor.mockResolvedValue({ metrics: [], modules: ['pulse'], policies: [] });
    scopes.assertAllowed.mockImplementation(() => {
      throw new ForbiddenException('Platform modules scope is not assigned: billing');
    });

    await expect(
      service.updateModuleGovernance(actor, 'billing', { active: false }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.moduleCatalogItem.update).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: AuditAction.AUTH_FORBIDDEN,
      resourceType: 'PlatformScope',
      resourceId: 'billing',
      metadata: expect.objectContaining({
        scopeKind: 'modules',
        requested: 'billing',
      }),
    }));
  });

  it('updates policies and audits the feature flag mutation when scope allows it', async () => {
    scopes.scopesFor.mockResolvedValue({
      metrics: [],
      modules: [],
      policies: ['billing.plan.pro.commercial'],
    });
    scopes.assertAllowed.mockReturnValue(undefined);
    prisma.billingFeatureFlag.upsert.mockResolvedValue({
      id: 'flag_1',
      key: 'billing.plan.pro.commercial',
      enabled: true,
      metadata: { reason: 'launch' },
      updatedAt: new Date('2026-05-08T12:30:00.000Z'),
    });

    await expect(
      service.updatePolicy(actor, 'billing.plan.pro.commercial', {
        enabled: true,
        metadata: { reason: 'launch' },
      }),
    ).resolves.toMatchObject({
      key: 'billing.plan.pro.commercial',
      enabled: true,
      updatedAt: '2026-05-08T12:30:00.000Z',
    });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: AuditAction.PLATFORM_POLICY_UPDATED,
      resourceId: 'flag_1',
    }));
  });
});
