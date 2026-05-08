import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditStatus } from '@prisma/client';
import { ModuleCatalogStatus, ModuleVisibility, Prisma } from '@prisma/client';
import { maskSensitiveMetricFields } from '../../common/security/sensitive-metrics';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { UsageMeteringService } from '../usage/usage-metering.service';
import {
  PlatformModuleQueryDto,
  PlatformPolicyQueryDto,
  PlatformUsageMetricsQueryDto,
  UpdatePlatformModuleGovernanceDto,
  UpdatePlatformPolicyDto,
} from './dto/platform-governance.dto';
import { PlatformScopeService } from './platform-scope.service';

@Injectable()
export class PlatformGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: UsageMeteringService,
    private readonly scopes: PlatformScopeService,
    private readonly audit: AuditService,
  ) {}

  async usageMetrics(actor: AuthenticatedUser, query: PlatformUsageMetricsQueryDto) {
    const scope = await this.scopes.scopesFor(actor);
    await this.assertScopeAllowed(actor, scope, 'metrics', 'usage');
    const modules = await this.filterScopeRequested(actor, scope, 'modules', query.module);
    const billingPeriod = query.billingPeriod ?? this.usage.billingPeriodFor(new Date());

    const grouped = await this.prisma.usageEvent.groupBy({
      by: ['tenantId', 'moduleSlug', 'metricType', 'unit'],
      where: {
        billingPeriod,
        tenantId: query.tenantId,
        ...(modules ? { moduleSlug: { in: modules } } : {}),
      },
      _sum: { quantity: true },
      _count: { _all: true },
      orderBy: [{ tenantId: 'asc' }, { metricType: 'asc' }],
    });

    const tenantIds = [...new Set(grouped.map((row) => row.tenantId))];
    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, slug: true },
    });
    const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));

    const records = grouped.map((row) => {
      const tenant = tenantById.get(row.tenantId);
      return {
        tenantId: row.tenantId,
        tenantName: tenant?.name ?? null,
        tenantSlug: tenant?.slug ?? null,
        moduleSlug: row.moduleSlug,
        metricType: row.metricType,
        unit: row.unit,
        quantity: row._sum.quantity?.toString() ?? '0',
        events: row._count._all,
        customerEmail: null,
        customerPhone: null,
        revenueRaw: null,
        marginRaw: null,
        providerCostRaw: null,
      };
    });

    return maskSensitiveMetricFields({
      billingPeriod,
      metricScope: 'usage',
      moduleFilter: modules ?? ['*'],
      records,
    }, actor);
  }

  async modules(actor: AuthenticatedUser, query: PlatformModuleQueryDto) {
    const scope = await this.scopes.scopesFor(actor);
    const modules = await this.filterScopeRequested(actor, scope, 'modules', query.module);

    return this.prisma.moduleCatalogItem.findMany({
      where: {
        ...(modules ? { slug: { in: modules } } : {}),
      },
      select: {
        id: true,
        slug: true,
        displayName: true,
        version: true,
        description: true,
        status: true,
        tier: true,
        visibility: true,
        rolloutState: true,
        featureFlag: true,
        active: true,
        permissions: true,
        metadata: true,
        registeredAt: true,
        _count: { select: { installations: true, purchases: true } },
      },
      orderBy: { displayName: 'asc' },
    });
  }

  async policies(actor: AuthenticatedUser, query: PlatformPolicyQueryDto) {
    const scope = await this.scopes.scopesFor(actor);
    const policies = await this.filterScopeRequested(actor, scope, 'policies', query.policy);

    const [featureFlags, rolloutModules] = await Promise.all([
      this.prisma.billingFeatureFlag.findMany({
        where: policies ? { key: { in: policies } } : {},
        select: { key: true, enabled: true, metadata: true, updatedAt: true },
        orderBy: { key: 'asc' },
      }),
      this.prisma.moduleCatalogItem.findMany({
        where: {
          ...(policies ? { featureFlag: { in: policies } } : { featureFlag: { not: null } }),
          status: ModuleCatalogStatus.PUBLIC,
          visibility: ModuleVisibility.PUBLIC,
        },
        select: {
          slug: true,
          displayName: true,
          featureFlag: true,
          rolloutState: true,
          active: true,
        },
        orderBy: { slug: 'asc' },
      }),
    ]);

    const modulesByPolicy = rolloutModules.reduce<Record<string, Array<Record<string, unknown>>>>(
      (acc, module) => {
        if (!module.featureFlag) return acc;
        acc[module.featureFlag] = acc[module.featureFlag] ?? [];
        acc[module.featureFlag].push({
          slug: module.slug,
          displayName: module.displayName,
          rolloutState: module.rolloutState,
          active: module.active,
        });
        return acc;
      },
      {},
    );

    return featureFlags.map((flag) => ({
      key: flag.key,
      enabled: flag.enabled,
      metadata: flag.metadata,
      updatedAt: flag.updatedAt.toISOString(),
      modules: modulesByPolicy[flag.key] ?? [],
    }));
  }

  async updateModuleGovernance(
    actor: AuthenticatedUser,
    moduleSlug: string,
    dto: UpdatePlatformModuleGovernanceDto,
  ) {
    const scope = await this.scopes.scopesFor(actor);
    await this.assertScopeAllowed(actor, scope, 'modules', moduleSlug);

    const existing = await this.prisma.moduleCatalogItem.findUnique({
      where: { slug: moduleSlug },
      select: {
        id: true,
        slug: true,
        active: true,
        status: true,
        visibility: true,
        rolloutState: true,
        tier: true,
      },
    });
    if (!existing) {
      throw new NotFoundException('Module not found.');
    }

    const updated = await this.prisma.moduleCatalogItem.update({
      where: { slug: moduleSlug },
      data: {
        active: dto.active ?? existing.active,
        status: dto.status ?? existing.status,
        visibility: dto.visibility ?? existing.visibility,
        rolloutState: dto.rolloutState ?? existing.rolloutState,
        tier: dto.tier ?? existing.tier,
      },
      select: {
        id: true,
        slug: true,
        displayName: true,
        active: true,
        status: true,
        visibility: true,
        rolloutState: true,
        tier: true,
        updatedAt: true,
      },
    });

    await this.audit.record({
      actorUserId: actor.sub,
      action: AuditAction.PLATFORM_MODULE_GOVERNANCE_UPDATED,
      status: AuditStatus.SUCCESS,
      resourceType: 'ModuleCatalogItem',
      resourceId: updated.id,
      metadata: {
        slug: moduleSlug,
        previous: existing,
        next: {
          active: updated.active,
          status: updated.status,
          visibility: updated.visibility,
          rolloutState: updated.rolloutState,
          tier: updated.tier,
        },
      },
    });

    return {
      ...updated,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async updatePolicy(
    actor: AuthenticatedUser,
    policyKey: string,
    dto: UpdatePlatformPolicyDto,
  ) {
    const scope = await this.scopes.scopesFor(actor);
    await this.assertScopeAllowed(actor, scope, 'policies', policyKey);

    const flag = await this.prisma.billingFeatureFlag.upsert({
      where: { key: policyKey },
      create: {
        key: policyKey,
        enabled: dto.enabled,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        enabled: dto.enabled,
        ...(dto.metadata ? { metadata: dto.metadata as Prisma.InputJsonValue } : {}),
      },
      select: {
        id: true,
        key: true,
        enabled: true,
        metadata: true,
        updatedAt: true,
      },
    });

    await this.audit.record({
      actorUserId: actor.sub,
      action: AuditAction.PLATFORM_POLICY_UPDATED,
      status: AuditStatus.SUCCESS,
      resourceType: 'BillingFeatureFlag',
      resourceId: flag.id,
      metadata: {
        key: policyKey,
        enabled: dto.enabled,
        metadataUpdated: !!dto.metadata,
      },
    });

    return {
      ...flag,
      updatedAt: flag.updatedAt.toISOString(),
    };
  }

  private async assertScopeAllowed(
    actor: AuthenticatedUser,
    scope: Awaited<ReturnType<PlatformScopeService['scopesFor']>>,
    kind: 'metrics' | 'modules' | 'policies',
    requested: string,
  ): Promise<void> {
    try {
      this.scopes.assertAllowed(scope, kind, requested);
    } catch (err) {
      if (err instanceof ForbiddenException) {
        await this.audit.record({
          actorUserId: actor.sub,
          action: AuditAction.AUTH_FORBIDDEN,
          status: AuditStatus.FAILURE,
          resourceType: 'PlatformScope',
          resourceId: requested,
          metadata: {
            role: actor.role,
            scopeKind: kind,
            requested,
          },
        });
      }
      throw err;
    }
  }

  private async filterScopeRequested(
    actor: AuthenticatedUser,
    scope: Awaited<ReturnType<PlatformScopeService['scopesFor']>>,
    kind: 'metrics' | 'modules' | 'policies',
    requested?: string,
  ): Promise<string[] | undefined> {
    try {
      return this.scopes.filterRequested(scope, kind, requested);
    } catch (err) {
      if (err instanceof ForbiddenException) {
        await this.audit.record({
          actorUserId: actor.sub,
          action: AuditAction.AUTH_FORBIDDEN,
          status: AuditStatus.FAILURE,
          resourceType: 'PlatformScope',
          resourceId: requested ?? kind,
          metadata: {
            role: actor.role,
            scopeKind: kind,
            requested: requested ?? null,
          },
        });
      }
      throw err;
    }
  }
}
