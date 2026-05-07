import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  BillingPlanStatus,
  BillingStatus,
  ModuleCatalogStatus,
  ModulePurchaseStatus,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditAction, AuditService } from '../../common/audit/audit.service';

@Injectable()
export class BillingService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    await this.seedCorePlans();
  }

  getEntitlements(tenantId: string) {
    return this.prisma.billingAccount.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
  }

  async listPlans() {
    const plans = await this.prisma.billingPlan.findMany({
      orderBy: { displayName: 'asc' },
    });
    const publicModuleCount = await this.prisma.moduleCatalogItem.count({
      where: { status: ModuleCatalogStatus.PUBLIC },
    });
    const flags = await this.prisma.billingFeatureFlag.findMany();
    const flagByKey = new Map(flags.map((flag) => [flag.key, flag]));

    return plans.map((plan) => {
      const flag = plan.commercialFeatureFlag
        ? flagByKey.get(plan.commercialFeatureFlag)
        : null;
      const featureFlagEnabled = plan.commercialFeatureFlag ? !!flag?.enabled : true;

      return {
        key: plan.key,
        displayName: plan.displayName,
        status: plan.status,
        commercialFeatureFlag: plan.commercialFeatureFlag,
        featureFlagEnabled,
        requiredPublicModules: plan.requiredPublicModules,
        publicModuleCount,
        commerciallyActive:
          plan.status === BillingPlanStatus.ACTIVE &&
          featureFlagEnabled &&
          publicModuleCount >= plan.requiredPublicModules,
        entitlements: plan.entitlements,
        metadata: plan.metadata,
      };
    });
  }

  async setFeatureFlag(
    key: string,
    enabled: boolean,
    actor: { tenantId: string; userId?: string },
  ) {
    const flag = await this.prisma.billingFeatureFlag.upsert({
      where: { key },
      create: { key, enabled },
      update: { enabled },
    });

    await this.audit.record({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: AuditAction.BILLING_FEATURE_FLAG_UPDATED,
      resourceType: 'BillingFeatureFlag',
      resourceId: flag.id,
      metadata: { key, enabled },
    });

    return flag;
  }

  async canEnableModule(tenantId: string, moduleSlug: string): Promise<boolean> {
    const module = await this.prisma.moduleCatalogItem.findUnique({
      where: { slug: moduleSlug },
    });

    if (!module || module.status !== ModuleCatalogStatus.PUBLIC) {
      return false;
    }

    const purchase = await this.prisma.modulePurchase.findUnique({
      where: {
        tenantId_moduleId: {
          tenantId,
          moduleId: module.id,
        },
      },
    });

    if (purchase?.status === ModulePurchaseStatus.ACTIVE) {
      return true;
    }

    const account = await this.prisma.billingAccount.findUnique({
      where: { tenantId },
      include: {
        plan: {
          include: {
            moduleEntitlements: {
              where: {
                moduleId: module.id,
                included: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!account || !this.isBillableAccount(account.status)) {
      return false;
    }

    const plan = account.plan;
    if (plan.status !== BillingPlanStatus.ACTIVE) {
      return false;
    }

    const commercialActive = await this.isPlanCommerciallyActive(plan.key);
    if (!commercialActive) {
      return false;
    }

    return plan.moduleEntitlements.length > 0;
  }

  async ensureDefaultModuleEntitlements(moduleSlug: string) {
    const module = await this.prisma.moduleCatalogItem.findUnique({
      where: { slug: moduleSlug },
    });
    const light = await this.prisma.billingPlan.findUnique({
      where: { key: 'light' },
    });

    if (!module || !light) {
      return;
    }

    await this.prisma.billingPlanModuleEntitlement.upsert({
      where: {
        planId_moduleId: {
          planId: light.id,
          moduleId: module.id,
        },
      },
      create: {
        planId: light.id,
        moduleId: module.id,
        included: true,
      },
      update: {
        included: true,
      },
    });
  }

  private async seedCorePlans() {
    const plans = [
      {
        key: 'light',
        displayName: 'Light',
        commercialFeatureFlag: 'billing.plan.light.commercial',
        requiredPublicModules: 1,
        featureEnabled: true,
      },
      {
        key: 'pro',
        displayName: 'Pro',
        commercialFeatureFlag: 'billing.plan.pro.commercial',
        requiredPublicModules: 2,
        featureEnabled: false,
      },
      {
        key: 'premium',
        displayName: 'Premium',
        commercialFeatureFlag: 'billing.plan.premium.commercial',
        requiredPublicModules: 3,
        featureEnabled: false,
      },
    ];

    await Promise.all(
      plans.map((plan) =>
        this.prisma.billingFeatureFlag.upsert({
          where: { key: plan.commercialFeatureFlag },
          create: {
            key: plan.commercialFeatureFlag,
            enabled: plan.featureEnabled,
          },
          update: {},
        }),
      ),
    );

    await Promise.all(
      plans.map((plan) =>
        this.prisma.billingPlan.upsert({
          where: { key: plan.key },
          create: {
            key: plan.key,
            displayName: plan.displayName,
            status: BillingPlanStatus.ACTIVE,
            commercialFeatureFlag: plan.commercialFeatureFlag,
            requiredPublicModules: plan.requiredPublicModules,
          },
          update: {
            displayName: plan.displayName,
            status: BillingPlanStatus.ACTIVE,
            commercialFeatureFlag: plan.commercialFeatureFlag,
            requiredPublicModules: plan.requiredPublicModules,
          },
        }),
      ),
    );
  }

  private async isPlanCommerciallyActive(planKey: string) {
    const plan = await this.prisma.billingPlan.findUnique({
      where: { key: planKey },
    });

    if (!plan || plan.status !== BillingPlanStatus.ACTIVE) {
      return false;
    }

    const flag = plan.commercialFeatureFlag
      ? await this.prisma.billingFeatureFlag.findUnique({
          where: { key: plan.commercialFeatureFlag },
        })
      : null;

    if (plan.commercialFeatureFlag && !flag?.enabled) {
      return false;
    }

    const publicModuleCount = await this.prisma.moduleCatalogItem.count({
      where: { status: ModuleCatalogStatus.PUBLIC },
    });

    return publicModuleCount >= plan.requiredPublicModules;
  }

  private isBillableAccount(status: BillingStatus) {
    const billable: BillingStatus[] = [
      BillingStatus.TRIALING,
      BillingStatus.ACTIVE,
      BillingStatus.INCOMPLETE,
    ];
    return billable.includes(status);
  }
}
