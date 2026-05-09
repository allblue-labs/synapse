import { ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import {
  ModuleCatalogStatus,
  ModuleRolloutState,
  ModuleTier,
  ModuleVisibility,
  Prisma,
  TenantModuleStatus,
} from '@prisma/client';
import type { ModuleAction, ModuleEvent, RegisteredModule } from '@synapse/contracts';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BillingService } from '../../modules/billing/billing.service';
import { SynapseCoreService } from './synapse-core.service';
import { PulseSynapseModule } from '../../product-modules/pulse/pulse.synapse-module';

@Injectable()
export class ModuleRegistryService implements OnModuleInit {
  constructor(
    private readonly core: SynapseCoreService,
    private readonly pulseModule: PulseSynapseModule,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly billing: BillingService,
  ) {}

  async onModuleInit() {
    await this.pulseModule.register(this.core);
    await Promise.all(
      this.core.listModules().map((module) => this.upsertCatalogItem(module)),
    );
    await Promise.all(
      this.core.listModules().map((module) =>
        this.billing.ensureDefaultModuleEntitlements(module.name),
      ),
    );
  }

  async list(tenantId: string) {
    const modules = await this.prisma.moduleCatalogItem.findMany({
      where: {
        status: ModuleCatalogStatus.PUBLIC,
        active: true,
        visibility: ModuleVisibility.PUBLIC,
        storeVisible: true,
      },
      include: {
        installations: {
          where: { tenantId },
          take: 1,
        },
      },
      orderBy: { displayName: 'asc' },
    });

    return modules.map((module) => {
      const installation = module.installations[0];
      return this.toRegisteredModule(
        module,
        installation?.status === TenantModuleStatus.ENABLED,
      );
    });
  }

  async enable(tenantId: string, name: string, actorUserId?: string) {
    const module = await this.prisma.moduleCatalogItem.findUnique({
      where: { slug: name },
    });
    if (
      !module ||
      module.status !== ModuleCatalogStatus.PUBLIC ||
      !module.active ||
      module.visibility !== ModuleVisibility.PUBLIC ||
      !module.storeVisible
    ) {
      return undefined;
    }

    const allowed = await this.billing.canEnableModule(tenantId, name);
    if (!allowed) {
      throw new ForbiddenException(`Tenant is not entitled to enable module: ${name}`);
    }

    await this.prisma.tenantModuleInstallation.upsert({
      where: {
        tenantId_moduleId: {
          tenantId,
          moduleId: module.id,
        },
      },
      create: {
        tenantId,
        moduleId: module.id,
        status: TenantModuleStatus.ENABLED,
        enabledAt: new Date(),
        disabledAt: null,
      },
      update: {
        status: TenantModuleStatus.ENABLED,
        enabledAt: new Date(),
        disabledAt: null,
      },
    });

    await this.core.runtimeState.setModuleState(tenantId, name, true);
    await this.audit.record({
      tenantId,
      actorUserId,
      action: AuditAction.MODULE_ENABLED,
      resourceType: 'ModuleCatalogItem',
      resourceId: module.id,
      metadata: { slug: name },
    });

    return this.toRegisteredModule(module, true);
  }

  async disable(tenantId: string, name: string, actorUserId?: string) {
    const module = await this.prisma.moduleCatalogItem.findUnique({
      where: { slug: name },
    });
    if (
      !module ||
      module.status !== ModuleCatalogStatus.PUBLIC ||
      !module.active ||
      module.visibility !== ModuleVisibility.PUBLIC ||
      !module.storeVisible
    ) {
      return undefined;
    }

    await this.prisma.tenantModuleInstallation.upsert({
      where: {
        tenantId_moduleId: {
          tenantId,
          moduleId: module.id,
        },
      },
      create: {
        tenantId,
        moduleId: module.id,
        status: TenantModuleStatus.DISABLED,
        enabledAt: null,
        disabledAt: new Date(),
      },
      update: {
        status: TenantModuleStatus.DISABLED,
        disabledAt: new Date(),
      },
    });

    await this.core.runtimeState.setModuleState(tenantId, name, false);
    await this.audit.record({
      tenantId,
      actorUserId,
      action: AuditAction.MODULE_DISABLED,
      resourceType: 'ModuleCatalogItem',
      resourceId: module.id,
      metadata: { slug: name },
    });

    return this.toRegisteredModule(module, false);
  }

  private async upsertCatalogItem(module: RegisteredModule) {
    await this.prisma.moduleCatalogItem.upsert({
      where: { slug: module.name },
      create: {
        slug: module.name,
        displayName: module.displayName,
        version: module.version,
        description: module.description,
        status: ModuleCatalogStatus.PUBLIC,
        tier: (module.tier as ModuleTier | undefined) ?? ModuleTier.FREE,
        visibility: (module.visibility as ModuleVisibility | undefined) ?? ModuleVisibility.PUBLIC,
        rolloutState: (module.rolloutState as ModuleRolloutState | undefined) ?? ModuleRolloutState.GA,
        featureFlag: module.featureFlag ?? null,
        active: module.active ?? true,
        storeVisible: module.storeVisible ?? true,
        permissions: (module.permissions ?? []) as Prisma.InputJsonValue,
        actions: module.actions as unknown as Prisma.InputJsonValue,
        events: (module.events ?? []) as unknown as Prisma.InputJsonValue,
        registeredAt: new Date(module.registeredAt),
      },
      update: {
        displayName: module.displayName,
        version: module.version,
        description: module.description,
        status: ModuleCatalogStatus.PUBLIC,
        tier: (module.tier as ModuleTier | undefined) ?? ModuleTier.FREE,
        visibility: (module.visibility as ModuleVisibility | undefined) ?? ModuleVisibility.PUBLIC,
        rolloutState: (module.rolloutState as ModuleRolloutState | undefined) ?? ModuleRolloutState.GA,
        featureFlag: module.featureFlag ?? null,
        active: module.active ?? true,
        permissions: (module.permissions ?? []) as Prisma.InputJsonValue,
        actions: module.actions as unknown as Prisma.InputJsonValue,
        events: (module.events ?? []) as unknown as Prisma.InputJsonValue,
        registeredAt: new Date(module.registeredAt),
      },
    });
  }

  private toRegisteredModule(
    module: {
      slug: string;
      displayName: string;
      version: string;
      description: string;
      permissions: Prisma.JsonValue;
      actions: Prisma.JsonValue;
      events: Prisma.JsonValue;
      tier: ModuleTier;
      visibility: ModuleVisibility;
      rolloutState: ModuleRolloutState;
      featureFlag: string | null;
      active: boolean;
      storeVisible: boolean;
      registeredAt: Date;
    },
    enabled: boolean,
  ): RegisteredModule {
    return {
      name: module.slug,
      displayName: module.displayName,
      version: module.version,
      description: module.description,
      tier: module.tier,
      visibility: module.visibility,
      rolloutState: module.rolloutState,
      featureFlag: module.featureFlag,
      active: module.active,
      storeVisible: module.storeVisible,
      permissions: module.permissions as string[],
      actions: module.actions as ModuleAction[],
      events: module.events as ModuleEvent[],
      enabled,
      registeredAt: module.registeredAt.toISOString(),
    };
  }
}
