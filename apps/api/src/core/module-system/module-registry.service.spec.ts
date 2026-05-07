import {
  ModuleCatalogStatus,
  ModuleRolloutState,
  ModuleTier,
  ModuleVisibility,
  TenantModuleStatus,
} from '@prisma/client';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BillingService } from '../../modules/billing/billing.service';
import { PulseSynapseModule } from '../../product-modules/pulse/pulse.synapse-module';
import { SynapseCoreService } from './synapse-core.service';
import { ModuleRegistryService } from './module-registry.service';

const registeredPulse = {
  name: 'pulse',
  displayName: 'Synapse Pulse',
  version: '0.1.0',
  description: 'Operational communication queues, AI extraction, validation, and workflow actions.',
  tier: ModuleTier.LIGHT,
  visibility: ModuleVisibility.PUBLIC,
  rolloutState: ModuleRolloutState.GA,
  active: true,
  permissions: ['pulse:read', 'pulse:write'],
  actions: [
    {
      name: 'pulse.entry.create',
      description: 'Accept an operational communication entry for queue processing.',
      requiredPermissions: ['pulse:write'],
      inputSchemaVersion: '2026-05-07',
    },
  ],
  events: [
    {
      name: 'pulse.entry.received',
      description: 'A Pulse entry was accepted for processing.',
      payloadSchemaVersion: '2026-05-07',
    },
  ],
  enabled: true,
  registeredAt: '2026-05-07T00:00:00.000Z',
};

function createCatalogRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'module_pulse',
    slug: 'pulse',
    displayName: 'Synapse Pulse',
    version: '0.1.0',
    description: 'Operational communication queues, AI extraction, validation, and workflow actions.',
    status: ModuleCatalogStatus.PUBLIC,
    tier: ModuleTier.LIGHT,
    visibility: ModuleVisibility.PUBLIC,
    rolloutState: ModuleRolloutState.GA,
    featureFlag: null,
    active: true,
    permissions: ['pulse:read', 'pulse:write'],
    actions: registeredPulse.actions,
    events: registeredPulse.events,
    metadata: {},
    registeredAt: new Date('2026-05-07T00:00:00.000Z'),
    createdAt: new Date('2026-05-07T00:00:00.000Z'),
    updatedAt: new Date('2026-05-07T00:00:00.000Z'),
    installations: [],
    ...overrides,
  };
}

function createService() {
  const core = {
    listModules: jest.fn(() => [registeredPulse]),
    runtimeState: {
      setModuleState: jest.fn(),
    },
  };
  const pulseModule = {
    register: jest.fn(),
  };
  const prisma = {
    moduleCatalogItem: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    tenantModuleInstallation: {
      upsert: jest.fn(),
    },
  };
  const audit = {
    record: jest.fn(),
  };
  const billing = {
    ensureDefaultModuleEntitlements: jest.fn(),
    canEnableModule: jest.fn(() => Promise.resolve(true)),
  };

  return {
    core,
    pulseModule,
    prisma,
    audit,
    billing,
    service: new ModuleRegistryService(
      core as unknown as SynapseCoreService,
      pulseModule as unknown as PulseSynapseModule,
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      billing as unknown as BillingService,
    ),
  };
}

describe('ModuleRegistryService', () => {
  it('seeds the Pulse manifest into the persisted catalog on startup', async () => {
    const { service, core, pulseModule, prisma, billing } = createService();

    await service.onModuleInit();

    expect(pulseModule.register).toHaveBeenCalledWith(core);
    expect(prisma.moduleCatalogItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'pulse' },
        create: expect.objectContaining({
          slug: 'pulse',
          displayName: 'Synapse Pulse',
          status: ModuleCatalogStatus.PUBLIC,
          tier: ModuleTier.LIGHT,
          visibility: ModuleVisibility.PUBLIC,
          rolloutState: ModuleRolloutState.GA,
          active: true,
        }),
        update: expect.objectContaining({
          displayName: 'Synapse Pulse',
          status: ModuleCatalogStatus.PUBLIC,
          tier: ModuleTier.LIGHT,
          visibility: ModuleVisibility.PUBLIC,
          rolloutState: ModuleRolloutState.GA,
          active: true,
        }),
      }),
    );
    expect(billing.ensureDefaultModuleEntitlements).toHaveBeenCalledWith('pulse');
  });

  it('lists public modules with tenant-specific enabled state', async () => {
    const { service, prisma } = createService();
    prisma.moduleCatalogItem.findMany.mockResolvedValue([
      createCatalogRecord({
        installations: [{ status: TenantModuleStatus.ENABLED }],
      }),
    ]);

    const modules = await service.list('tenant_a');

    expect(prisma.moduleCatalogItem.findMany).toHaveBeenCalledWith({
      where: {
        status: ModuleCatalogStatus.PUBLIC,
        active: true,
        visibility: ModuleVisibility.PUBLIC,
      },
      include: {
        installations: {
          where: { tenantId: 'tenant_a' },
          take: 1,
        },
      },
      orderBy: { displayName: 'asc' },
    });
    expect(modules).toEqual([
      expect.objectContaining({
        name: 'pulse',
        displayName: 'Synapse Pulse',
        tier: ModuleTier.LIGHT,
        visibility: ModuleVisibility.PUBLIC,
        rolloutState: ModuleRolloutState.GA,
        active: true,
        enabled: true,
      }),
    ]);
  });

  it('persists tenant enablement, updates runtime state, and audits the action', async () => {
    const { service, core, prisma, audit, billing } = createService();
    prisma.moduleCatalogItem.findUnique.mockResolvedValue(createCatalogRecord());
    prisma.tenantModuleInstallation.upsert.mockResolvedValue({});

    const result = await service.enable('tenant_a', 'pulse', 'user_1');

    expect(billing.canEnableModule).toHaveBeenCalledWith('tenant_a', 'pulse');
    expect(prisma.tenantModuleInstallation.upsert).toHaveBeenCalledWith({
      where: {
        tenantId_moduleId: {
          tenantId: 'tenant_a',
          moduleId: 'module_pulse',
        },
      },
      create: expect.objectContaining({
        tenantId: 'tenant_a',
        moduleId: 'module_pulse',
        status: TenantModuleStatus.ENABLED,
        disabledAt: null,
      }),
      update: expect.objectContaining({
        status: TenantModuleStatus.ENABLED,
        disabledAt: null,
      }),
    });
    expect(core.runtimeState.setModuleState).toHaveBeenCalledWith('tenant_a', 'pulse', true);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_a',
        actorUserId: 'user_1',
        action: AuditAction.MODULE_ENABLED,
        resourceId: 'module_pulse',
        metadata: { slug: 'pulse' },
      }),
    );
    expect(result).toEqual(expect.objectContaining({ name: 'pulse', enabled: true }));
  });

  it('does not enable disabled catalog modules', async () => {
    const { service, core, prisma, audit, billing } = createService();
    prisma.moduleCatalogItem.findUnique.mockResolvedValue(
      createCatalogRecord({ status: ModuleCatalogStatus.DISABLED }),
    );

    await expect(service.enable('tenant_a', 'pulse', 'user_1')).resolves.toBeUndefined();

    expect(prisma.tenantModuleInstallation.upsert).not.toHaveBeenCalled();
    expect(billing.canEnableModule).not.toHaveBeenCalled();
    expect(core.runtimeState.setModuleState).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rejects module enablement when billing entitlements deny access', async () => {
    const { service, core, prisma, audit, billing } = createService();
    prisma.moduleCatalogItem.findUnique.mockResolvedValue(createCatalogRecord());
    billing.canEnableModule.mockResolvedValue(false);

    await expect(service.enable('tenant_a', 'pulse', 'user_1')).rejects.toThrow(
      'Tenant is not entitled to enable module: pulse',
    );

    expect(prisma.tenantModuleInstallation.upsert).not.toHaveBeenCalled();
    expect(core.runtimeState.setModuleState).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
