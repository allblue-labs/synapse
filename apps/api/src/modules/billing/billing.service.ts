import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingPlanStatus,
  BillingStatus,
  ModuleCatalogStatus,
  ModuleTier,
  ModulePurchaseStatus,
  Prisma,
  StripeWebhookEventStatus,
  UsageMetricType,
} from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { BillingCheckoutSession, BillingPlanKey, BillingPortalSession } from '@synapse/contracts';
import type { Redis } from 'ioredis';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

type StripeEvent = {
  id: string;
  type: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

type CreateSubscriptionCheckoutSessionInput = {
  tenantId: string;
  actorUserId?: string;
  actorEmail: string;
  planKey: BillingPlanKey;
  successUrl: string;
  cancelUrl: string;
};

type CreatePortalSessionInput = {
  tenantId: string;
  actorUserId?: string;
  returnUrl: string;
};

type UpsertBillingPlanInput = {
  key: string;
  displayName: string;
  status?: BillingPlanStatus;
  commercialFeatureFlag?: string | null;
  requiredPublicModules?: number;
  entitlements?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  actorUserId?: string;
};

export type TenantPlanLimits = {
  planKey: string;
  maxTenants: number;
  monthlyCredits: number;
  maxUsersPerTenant: number;
  maxModules: number;
  maxActiveChannelSets: number;
  allowedModuleTiers: ModuleTier[];
  custom: Record<string, unknown>;
};

const TENANT_PLAN_LIMITS_CACHE_TTL_SECONDS = 60;

type StripeCustomerResponse = {
  id?: string;
};

type StripeCheckoutSessionResponse = {
  id?: string;
  url?: string | null;
};

type StripePortalSessionResponse = {
  id?: string;
  url?: string | null;
};

@Injectable()
export class BillingService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redis?: Redis,
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
      where: { status: ModuleCatalogStatus.PUBLIC, storeVisible: true },
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

  getPlan(key: string) {
    return this.prisma.billingPlan.findUniqueOrThrow({
      where: { key },
      include: { moduleEntitlements: { include: { module: true } } },
    });
  }

  async upsertPlan(input: UpsertBillingPlanInput) {
    const plan = await this.prisma.billingPlan.upsert({
      where: { key: input.key },
      create: {
        key: input.key,
        displayName: input.displayName,
        status: input.status ?? BillingPlanStatus.DRAFT,
        commercialFeatureFlag: input.commercialFeatureFlag ?? null,
        requiredPublicModules: input.requiredPublicModules ?? 0,
        entitlements: (input.entitlements ?? this.defaultPlanEntitlements(input.key)) as Prisma.InputJsonValue,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        displayName: input.displayName,
        ...(input.status ? { status: input.status } : {}),
        commercialFeatureFlag: input.commercialFeatureFlag ?? null,
        ...(input.requiredPublicModules !== undefined ? { requiredPublicModules: input.requiredPublicModules } : {}),
        ...(input.entitlements ? { entitlements: input.entitlements as Prisma.InputJsonValue } : {}),
        ...(input.metadata ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
      },
    });

    await this.audit.record({
      actorUserId: input.actorUserId,
      action: AuditAction.BILLING_PLAN_UPDATED,
      resourceType: 'BillingPlan',
      resourceId: plan.id,
      metadata: {
        key: plan.key,
        status: plan.status,
        requiredPublicModules: plan.requiredPublicModules,
      },
    });
    await this.invalidatePlanLimitsForPlan(plan.key);

    return plan;
  }

  async deletePlan(key: string, actorUserId?: string) {
    const accounts = await this.prisma.billingAccount.count({ where: { planKey: key } });
    if (accounts > 0) {
      throw new ConflictException('Billing plan cannot be deleted while tenants are assigned to it.');
    }

    const plan = await this.prisma.billingPlan.delete({ where: { key } });
    await this.audit.record({
      actorUserId,
      action: AuditAction.BILLING_PLAN_DELETED,
      resourceType: 'BillingPlan',
      resourceId: plan.id,
      metadata: { key },
    });
    await this.invalidatePlanLimitsForPlan(key);

    return { deleted: true, key };
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
    await this.invalidatePlanLimitsForFeatureFlag(key);

    return flag;
  }

  async createSubscriptionCheckoutSession(
    input: CreateSubscriptionCheckoutSessionInput,
  ): Promise<BillingCheckoutSession> {
    this.assertAllowedBillingRedirectUrl(input.successUrl);
    this.assertAllowedBillingRedirectUrl(input.cancelUrl);

    const plan = await this.prisma.billingPlan.findUnique({
      where: { key: input.planKey },
    });
    if (!plan || plan.status !== BillingPlanStatus.ACTIVE) {
      throw new NotFoundException('Billing plan is not available.');
    }

    const commerciallyActive = await this.isPlanCommerciallyActive(plan.key);
    if (!commerciallyActive) {
      throw new ForbiddenException('Billing plan is not commercially active.');
    }

    const stripePriceId = this.stripePriceIdForPlan(plan);
    if (!stripePriceId) {
      throw new ServiceUnavailableException('Stripe price is not configured for this plan.');
    }

    const account = await this.prisma.billingAccount.findUnique({
      where: { tenantId: input.tenantId },
      include: { tenant: true },
    });
    if (!account) {
      throw new NotFoundException('Billing account was not found for tenant.');
    }

    const stripeCustomerId = account.stripeCustomerId ??
      await this.provisionStripeCustomer({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        email: input.actorEmail,
        tenantName: account.tenant.name,
      });

    const session = await this.createStripeCheckoutSession({
      tenantId: input.tenantId,
      stripeCustomerId,
      stripePriceId,
      planKey: input.planKey,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });

    await this.audit.record({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: AuditAction.BILLING_STRIPE_CHECKOUT_CREATED,
      resourceType: 'StripeCheckoutSession',
      resourceId: session.id,
      metadata: {
        planKey: input.planKey,
        stripeCustomerId,
      },
    });

    return {
      id: session.id,
      url: session.url,
      stripeCustomerId,
      planKey: input.planKey,
    };
  }

  async createPortalSession(input: CreatePortalSessionInput): Promise<BillingPortalSession> {
    this.assertAllowedBillingRedirectUrl(input.returnUrl);

    const account = await this.prisma.billingAccount.findUnique({
      where: { tenantId: input.tenantId },
    });
    if (!account) {
      throw new NotFoundException('Billing account was not found for tenant.');
    }
    if (!account.stripeCustomerId) {
      throw new BadRequestException('Billing account does not have a Stripe customer.');
    }

    const session = await this.createStripePortalSession({
      stripeCustomerId: account.stripeCustomerId,
      returnUrl: input.returnUrl,
    });

    await this.audit.record({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: AuditAction.BILLING_STRIPE_PORTAL_CREATED,
      resourceType: 'StripePortalSession',
      resourceId: session.id,
      metadata: {
        stripeCustomerId: account.stripeCustomerId,
      },
    });

    return {
      id: session.id,
      url: session.url,
      stripeCustomerId: account.stripeCustomerId,
    };
  }

  async processStripeWebhook(rawBody: Buffer, signatureHeader?: string) {
    const event = this.constructStripeWebhookEvent(rawBody, signatureHeader);
    const existing = await this.prisma.stripeWebhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });
    if (existing) {
      return {
        received: true,
        duplicate: true,
        eventId: event.id,
        status: existing.status,
      };
    }

    try {
      const status = await this.reconcileStripeEvent(event);
      const record = await this.prisma.stripeWebhookEvent.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          status,
          payload: JSON.parse(rawBody.toString('utf8')) as Prisma.InputJsonValue,
          processedAt: new Date(),
        },
      });

      await this.audit.record({
        action: AuditAction.BILLING_STRIPE_WEBHOOK_PROCESSED,
        resourceType: 'StripeWebhookEvent',
        resourceId: record.id,
        metadata: {
          stripeEventId: event.id,
          eventType: event.type,
          status,
        },
      });

      return {
        received: true,
        duplicate: false,
        eventId: event.id,
        status,
      };
    } catch (err) {
      const record = await this.prisma.stripeWebhookEvent.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          status: StripeWebhookEventStatus.FAILED,
          errorMessage: err instanceof Error ? err.message : String(err),
          payload: JSON.parse(rawBody.toString('utf8')) as Prisma.InputJsonValue,
          processedAt: new Date(),
        },
      });

      return {
        received: true,
        duplicate: false,
        eventId: event.id,
        status: record.status,
        errorMessage: record.errorMessage,
      };
    }
  }

  async canEnableModule(tenantId: string, moduleSlug: string): Promise<boolean> {
    return this.canUseModuleFeature({ tenantId, moduleSlug });
  }

  async isModuleEnabledForTenant(tenantId: string, moduleSlug: string): Promise<boolean> {
    const installation = await this.prisma.tenantModuleInstallation.findFirst({
      where: {
        tenantId,
        status: 'ENABLED',
        module: { slug: moduleSlug },
      },
      select: { id: true },
    });

    return !!installation;
  }

  async canUseModuleFeature(input: {
    tenantId: string;
    moduleSlug: string;
    feature?: string;
    creditsRequired?: number;
  }): Promise<boolean> {
    const module = await this.prisma.moduleCatalogItem.findUnique({
      where: { slug: input.moduleSlug },
    });

    if (!module || module.status !== ModuleCatalogStatus.PUBLIC || !module.storeVisible) {
      return false;
    }

    const purchase = await this.prisma.modulePurchase.findUnique({
      where: {
        tenantId_moduleId: {
          tenantId: input.tenantId,
          moduleId: module.id,
        },
      },
    });

    if (purchase?.status === ModulePurchaseStatus.ACTIVE) {
      return true;
    }

    const account = await this.prisma.billingAccount.findUnique({
      where: { tenantId: input.tenantId },
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

    const limits = this.limitsFromPlan(plan);
    if (!limits.allowedModuleTiers.includes(module.tier ?? ModuleTier.FREE)) {
      return false;
    }

    if (input.creditsRequired && input.creditsRequired > 0) {
      const remaining = await this.remainingMonthlyCredits(input.tenantId, limits);
      if (remaining < input.creditsRequired) {
        return false;
      }
    }

    return plan.moduleEntitlements.length > 0 || module.tier === ModuleTier.FREE;
  }

  async consumeUsageOrReject(input: {
    tenantId: string;
    moduleSlug?: string;
    metricType: UsageMetricType;
    quantity: number;
    unit: string;
    resourceType?: string;
    resourceId?: string;
    idempotencyKey?: string;
    credits?: number;
    metadata?: Record<string, unknown>;
  }) {
    if (input.idempotencyKey) {
      const existing = await this.prisma.usageEvent.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId: input.tenantId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (existing) {
        return existing;
      }
    }

    const limits = await this.getTenantPlanLimits(input.tenantId);
    const credits = input.credits ?? input.quantity;
    if (credits > 0) {
      const remaining = await this.remainingMonthlyCredits(input.tenantId, limits);
      if (remaining < credits) {
        throw new ForbiddenException('Monthly credit quota exceeded for this workspace.');
      }
    }

    const data = {
      tenantId: input.tenantId,
      moduleSlug: input.moduleSlug,
      metricType: input.metricType,
      quantity: new Prisma.Decimal(input.quantity),
      unit: input.unit,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      idempotencyKey: input.idempotencyKey,
      billingPeriod: this.billingPeriodFor(new Date()),
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    };

    if (!input.idempotencyKey) {
      return this.prisma.usageEvent.create({ data });
    }

    return this.prisma.usageEvent.upsert({
      where: {
        tenantId_idempotencyKey: {
          tenantId: input.tenantId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      create: data,
      update: {},
    });
  }

  async getTenantPlanLimits(tenantId: string): Promise<TenantPlanLimits> {
    const cached = await this.readTenantPlanLimitsCache(tenantId);
    if (cached) {
      return cached;
    }

    const account = await this.prisma.billingAccount.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
    if (!account) {
      throw new NotFoundException('Billing account was not found for tenant.');
    }

    const limits = this.limitsFromPlan(account.plan);
    await this.writeTenantPlanLimitsCache(tenantId, limits);
    return limits;
  }

  async assertCanCreateTenantForUser(userId: string) {
    const ownedMemberships = await this.prisma.userMembership.findMany({
      where: { userId, role: 'OWNER' },
      include: { tenant: { include: { billingAccount: { include: { plan: true } } } } },
    });

    const limits = this.limitsForUserTenantCreation(ownedMemberships.map((membership) => membership.tenant.billingAccount?.plan));
    if (ownedMemberships.length >= limits.maxTenants) {
      throw new ForbiddenException(
        `Workspace limit reached for your current plan. Plan ${limits.planKey} allows ${limits.maxTenants} workspace(s).`,
      );
    }

    return limits;
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
        key: 'trial',
        displayName: 'Trial',
        commercialFeatureFlag: null,
        requiredPublicModules: 0,
        featureEnabled: true,
        entitlements: this.defaultPlanEntitlements('trial'),
      },
      {
        key: 'light',
        displayName: 'Light',
        commercialFeatureFlag: 'billing.plan.light.commercial',
        requiredPublicModules: 1,
        featureEnabled: true,
        entitlements: this.defaultPlanEntitlements('light'),
      },
      {
        key: 'pro',
        displayName: 'Pro',
        commercialFeatureFlag: 'billing.plan.pro.commercial',
        requiredPublicModules: 2,
        featureEnabled: false,
        entitlements: this.defaultPlanEntitlements('pro'),
      },
      {
        key: 'premium',
        displayName: 'Premium',
        commercialFeatureFlag: 'billing.plan.premium.commercial',
        requiredPublicModules: 3,
        featureEnabled: false,
        entitlements: this.defaultPlanEntitlements('premium'),
      },
    ];

    await Promise.all(
      plans.filter((plan) => plan.commercialFeatureFlag).map((plan) =>
        this.prisma.billingFeatureFlag.upsert({
          where: { key: plan.commercialFeatureFlag! },
          create: {
            key: plan.commercialFeatureFlag!,
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
            entitlements: plan.entitlements as Prisma.InputJsonValue,
          },
          update: {
            displayName: plan.displayName,
            commercialFeatureFlag: plan.commercialFeatureFlag,
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
      where: { status: ModuleCatalogStatus.PUBLIC, storeVisible: true },
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

  private limitsFromPlan(plan: { key: string; entitlements: Prisma.JsonValue }): TenantPlanLimits {
    const entitlements = this.objectFromUnknown(plan.entitlements);
    const quotas = this.objectFromUnknown(entitlements.quotas);
    const moduleTiers = Array.isArray(entitlements.allowedModuleTiers)
      ? entitlements.allowedModuleTiers.filter((tier): tier is ModuleTier =>
          Object.values(ModuleTier).includes(tier as ModuleTier),
        )
      : this.defaultPlanEntitlements(plan.key).allowedModuleTiers;

    return {
      planKey: plan.key,
      maxTenants: this.numberFromUnknown(quotas.maxTenants, this.defaultPlanEntitlements(plan.key).quotas.maxTenants),
      monthlyCredits: this.numberFromUnknown(quotas.monthlyCredits, this.defaultPlanEntitlements(plan.key).quotas.monthlyCredits),
      maxUsersPerTenant: this.numberFromUnknown(quotas.maxUsersPerTenant, this.defaultPlanEntitlements(plan.key).quotas.maxUsersPerTenant),
      maxModules: this.numberFromUnknown(quotas.maxModules, this.defaultPlanEntitlements(plan.key).quotas.maxModules),
      maxActiveChannelSets: this.numberFromUnknown(quotas.maxActiveChannelSets, this.defaultPlanEntitlements(plan.key).quotas.maxActiveChannelSets),
      allowedModuleTiers: moduleTiers,
      custom: this.objectFromUnknown(entitlements.custom),
    };
  }

  private async readTenantPlanLimitsCache(tenantId: string): Promise<TenantPlanLimits | null> {
    if (!this.redis) return null;
    try {
      const value = await this.redis.get(this.tenantPlanLimitsCacheKey(tenantId));
      if (!value) return null;
      return this.parseTenantPlanLimits(JSON.parse(value));
    } catch {
      return null;
    }
  }

  private async writeTenantPlanLimitsCache(tenantId: string, limits: TenantPlanLimits) {
    if (!this.redis) return;
    try {
      await this.redis.set(
        this.tenantPlanLimitsCacheKey(tenantId),
        JSON.stringify(limits),
        'EX',
        TENANT_PLAN_LIMITS_CACHE_TTL_SECONDS,
      );
    } catch {
      // Cache is an accelerator only. PostgreSQL remains source of truth.
    }
  }

  private async invalidateTenantPlanLimits(tenantId: string) {
    if (!this.redis) return;
    try {
      await this.redis.del(this.tenantPlanLimitsCacheKey(tenantId));
    } catch {
      // Best-effort cache invalidation; short TTL bounds stale reads.
    }
  }

  private async invalidatePlanLimitsForPlan(planKey: string) {
    if (!this.redis) return;
    try {
      const accounts = await this.prisma.billingAccount.findMany({
        where: { planKey },
        select: { tenantId: true },
      });
      await Promise.all(accounts.map((account) => this.invalidateTenantPlanLimits(account.tenantId)));
    } catch {
      // Best-effort cache invalidation; short TTL bounds stale reads.
    }
  }

  private async invalidatePlanLimitsForFeatureFlag(key: string) {
    if (!this.redis) return;
    try {
      const plans = await this.prisma.billingPlan.findMany({
        where: { commercialFeatureFlag: key },
        select: { key: true },
      });
      await Promise.all(plans.map((plan) => this.invalidatePlanLimitsForPlan(plan.key)));
    } catch {
      // Best-effort cache invalidation; short TTL bounds stale reads.
    }
  }

  private tenantPlanLimitsCacheKey(tenantId: string) {
    return `billing:tenant-plan-limits:${tenantId}`;
  }

  private parseTenantPlanLimits(value: unknown): TenantPlanLimits | null {
    const object = this.objectFromUnknown(value);
    if (
      typeof object.planKey !== 'string' ||
      typeof object.maxTenants !== 'number' ||
      typeof object.monthlyCredits !== 'number' ||
      typeof object.maxUsersPerTenant !== 'number' ||
      typeof object.maxModules !== 'number' ||
      typeof object.maxActiveChannelSets !== 'number' ||
      !Array.isArray(object.allowedModuleTiers)
    ) {
      return null;
    }

    const allowedModuleTiers = object.allowedModuleTiers.filter((tier): tier is ModuleTier =>
      Object.values(ModuleTier).includes(tier as ModuleTier),
    );
    if (allowedModuleTiers.length === 0) {
      return null;
    }

    return {
      planKey: object.planKey,
      maxTenants: object.maxTenants,
      monthlyCredits: object.monthlyCredits,
      maxUsersPerTenant: object.maxUsersPerTenant,
      maxModules: object.maxModules,
      maxActiveChannelSets: object.maxActiveChannelSets,
      allowedModuleTiers,
      custom: this.objectFromUnknown(object.custom),
    };
  }

  private limitsForUserTenantCreation(plans: Array<{ key: string; entitlements: Prisma.JsonValue } | null | undefined>) {
    if (plans.length === 0) {
      return this.limitsFromPlan({
        key: 'trial',
        entitlements: this.defaultPlanEntitlements('trial') as Prisma.JsonValue,
      });
    }

    return plans
      .filter((plan): plan is { key: string; entitlements: Prisma.JsonValue } => !!plan)
      .map((plan) => this.limitsFromPlan(plan))
      .sort((a, b) => b.maxTenants - a.maxTenants)[0];
  }

  private async remainingMonthlyCredits(tenantId: string, limits: TenantPlanLimits) {
    const used = await this.prisma.usageEvent.aggregate({
      where: {
        tenantId,
        billingPeriod: this.billingPeriodFor(new Date()),
      },
      _sum: { quantity: true },
    });
    const usedCredits = Number(used._sum.quantity ?? 0);
    return Math.max(0, limits.monthlyCredits - usedCredits);
  }

  private billingPeriodFor(date: Date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private defaultPlanEntitlements(planKey: string) {
    const byPlan: Record<string, {
      allowedModuleTiers: ModuleTier[];
      quotas: {
        maxTenants: number;
        monthlyCredits: number;
        maxUsersPerTenant: number;
        maxModules: number;
        maxActiveChannelSets: number;
      };
      custom: Record<string, unknown>;
    }> = {
      trial: {
        allowedModuleTiers: [ModuleTier.FREE, ModuleTier.LIGHT],
        quotas: { maxTenants: 1, monthlyCredits: 500, maxUsersPerTenant: 1, maxModules: 1, maxActiveChannelSets: 1 },
        custom: {},
      },
      light: {
        allowedModuleTiers: [ModuleTier.FREE, ModuleTier.LIGHT],
        quotas: { maxTenants: 1, monthlyCredits: 3000, maxUsersPerTenant: 3, maxModules: 3, maxActiveChannelSets: 1 },
        custom: {},
      },
      pro: {
        allowedModuleTiers: [ModuleTier.FREE, ModuleTier.LIGHT, ModuleTier.PRO],
        quotas: { maxTenants: 2, monthlyCredits: 15000, maxUsersPerTenant: 15, maxModules: 12, maxActiveChannelSets: 5 },
        custom: {},
      },
      premium: {
        allowedModuleTiers: [ModuleTier.FREE, ModuleTier.LIGHT, ModuleTier.PRO, ModuleTier.PREMIUM],
        quotas: { maxTenants: 4, monthlyCredits: 60000, maxUsersPerTenant: 50, maxModules: 50, maxActiveChannelSets: 20 },
        custom: {},
      },
    };

    return byPlan[planKey] ?? byPlan.trial;
  }

  private numberFromUnknown(value: unknown, fallback: number) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  private stripePriceIdForPlan(plan: { key: string; metadata: Prisma.JsonValue }) {
    const metadata = this.objectFromUnknown(plan.metadata);
    const metadataPrice = metadata.stripePriceId;
    if (typeof metadataPrice === 'string' && metadataPrice.trim()) {
      return metadataPrice;
    }

    return this.config.get<string>(`STRIPE_PRICE_${plan.key.toUpperCase()}`) || undefined;
  }

  private assertAllowedBillingRedirectUrl(value: string) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new BadRequestException('Billing redirect URL is invalid.');
    }

    const allowedOrigins = this.billingRedirectAllowedOrigins();
    if (!allowedOrigins.has(parsed.origin)) {
      throw new ForbiddenException('Billing redirect URL origin is not allowed.');
    }
  }

  private billingRedirectAllowedOrigins() {
    const configured = this.config.get<string>('BILLING_REDIRECT_ALLOWED_ORIGINS');
    const fallback = this.config.get<string>('CORS_ORIGINS') ?? '';
    const raw = configured ?? fallback;
    const origins = raw
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    return new Set(origins);
  }

  private async provisionStripeCustomer(input: {
    tenantId: string;
    actorUserId?: string;
    email: string;
    tenantName: string;
  }) {
    const response = await this.stripeFormRequest<StripeCustomerResponse>(
      '/v1/customers',
      {
        email: input.email,
        name: input.tenantName,
        description: `Synapse tenant ${input.tenantId}`,
        metadata: {
          tenantId: input.tenantId,
          synapse_resource: 'tenant',
        },
      },
    );

    if (!response.id) {
      throw new ServiceUnavailableException('Stripe customer creation returned no id.');
    }

    await this.prisma.billingAccount.update({
      where: { tenantId: input.tenantId },
      data: { stripeCustomerId: response.id },
    });
    await this.invalidateTenantPlanLimits(input.tenantId);

    await this.audit.record({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: AuditAction.BILLING_STRIPE_CUSTOMER_CREATED,
      resourceType: 'BillingAccount',
      resourceId: input.tenantId,
      metadata: {
        stripeCustomerId: response.id,
      },
    });

    return response.id;
  }

  private async createStripeCheckoutSession(input: {
    tenantId: string;
    stripeCustomerId: string;
    stripePriceId: string;
    planKey: BillingPlanKey;
    successUrl: string;
    cancelUrl: string;
  }) {
    const response = await this.stripeFormRequest<StripeCheckoutSessionResponse>(
      '/v1/checkout/sessions',
      {
        mode: 'subscription',
        customer: input.stripeCustomerId,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: input.tenantId,
        line_items: [
          {
            price: input.stripePriceId,
            quantity: 1,
          },
        ],
        metadata: {
          tenantId: input.tenantId,
          synapse_plan_key: input.planKey,
        },
        subscription_data: {
          metadata: {
            tenantId: input.tenantId,
            synapse_plan_key: input.planKey,
          },
        },
      },
    );

    if (!response.id || !response.url) {
      throw new ServiceUnavailableException('Stripe checkout session returned no redirect URL.');
    }

    return {
      id: response.id,
      url: response.url,
    };
  }

  private async createStripePortalSession(input: {
    stripeCustomerId: string;
    returnUrl: string;
  }) {
    const response = await this.stripeFormRequest<StripePortalSessionResponse>(
      '/v1/billing_portal/sessions',
      {
        customer: input.stripeCustomerId,
        return_url: input.returnUrl,
      },
    );

    if (!response.id || !response.url) {
      throw new ServiceUnavailableException('Stripe portal session returned no redirect URL.');
    }

    return {
      id: response.id,
      url: response.url,
    };
  }

  private async stripeFormRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new ServiceUnavailableException('Stripe secret key is not configured.');
    }

    const baseUrl = this.config.get<string>('STRIPE_BASE_URL') ?? 'https://api.stripe.com';
    const apiVersion = this.config.get<string>('STRIPE_API_VERSION') ?? '2026-02-25.preview';
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': apiVersion,
      },
      body: this.toStripeFormBody(body),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new ServiceUnavailableException(`Stripe API request failed: ${text}`);
    }

    return JSON.parse(text) as T;
  }

  private toStripeFormBody(body: Record<string, unknown>) {
    const params = new URLSearchParams();
    this.appendStripeFormValue(params, undefined, body);
    return params;
  }

  private appendStripeFormValue(
    params: URLSearchParams,
    key: string | undefined,
    value: unknown,
  ) {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        this.appendStripeFormValue(params, `${key}[${index}]`, item);
      });
      return;
    }

    if (typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => {
        this.appendStripeFormValue(
          params,
          key ? `${key}[${childKey}]` : childKey,
          childValue,
        );
      });
      return;
    }

    if (!key) {
      return;
    }

    params.append(key, String(value));
  }

  private constructStripeWebhookEvent(rawBody: Buffer, signatureHeader?: string): StripeEvent {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new ServiceUnavailableException('Stripe webhook secret is not configured.');
    }
    if (!signatureHeader) {
      throw new BadRequestException('Missing Stripe-Signature header.');
    }

    const timestamp = this.extractStripeSignaturePart(signatureHeader, 't');
    const signatures = this.extractStripeSignatureParts(signatureHeader, 'v1');
    if (!timestamp || signatures.length === 0) {
      throw new BadRequestException('Invalid Stripe-Signature header.');
    }

    const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
    if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
      throw new BadRequestException('Stripe webhook signature timestamp is outside tolerance.');
    }

    const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
    const expected = createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');

    const valid = signatures.some((signature) => this.safeCompareHex(signature, expected));
    if (!valid) {
      throw new BadRequestException('Invalid Stripe webhook signature.');
    }

    const parsed = JSON.parse(rawBody.toString('utf8')) as StripeEvent;
    if (!parsed.id || !parsed.type) {
      throw new BadRequestException('Invalid Stripe webhook event payload.');
    }
    return parsed;
  }

  private extractStripeSignaturePart(header: string, key: string) {
    return this.extractStripeSignatureParts(header, key)[0];
  }

  private extractStripeSignatureParts(header: string, key: string) {
    return header
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.startsWith(`${key}=`))
      .map((part) => part.slice(key.length + 1));
  }

  private safeCompareHex(a: string, b: string) {
    const aBuffer = Buffer.from(a, 'hex');
    const bBuffer = Buffer.from(b, 'hex');
    return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
  }

  private async reconcileStripeEvent(event: StripeEvent): Promise<StripeWebhookEventStatus> {
    const object = event.data?.object;
    if (!object) {
      return StripeWebhookEventStatus.IGNORED;
    }

    if (event.type.startsWith('customer.subscription.')) {
      await this.reconcileStripeSubscription(object);
      return StripeWebhookEventStatus.PROCESSED;
    }

    if (event.type === 'invoice.paid') {
      await this.reconcileInvoiceStatus(object, BillingStatus.ACTIVE);
      return StripeWebhookEventStatus.PROCESSED;
    }

    if (event.type === 'invoice.payment_failed') {
      await this.reconcileInvoiceStatus(object, BillingStatus.PAST_DUE);
      return StripeWebhookEventStatus.PROCESSED;
    }

    return StripeWebhookEventStatus.IGNORED;
  }

  private async reconcileStripeSubscription(subscription: Record<string, unknown>) {
    const subscriptionId = typeof subscription.id === 'string' ? subscription.id : undefined;
    const customerId = this.stringFromExpandable(subscription.customer);
    const metadata = this.objectFromUnknown(subscription.metadata);
    const tenantId = typeof metadata.tenantId === 'string' ? metadata.tenantId : undefined;
    const planKey = this.validPlanKey(metadata.synapse_plan_key);
    const status = this.mapStripeSubscriptionStatus(
      typeof subscription.status === 'string' ? subscription.status : undefined,
    );
    const currentPeriodEnd = this.dateFromUnix(subscription.current_period_end);

    const where = tenantId
      ? { tenantId }
      : subscriptionId
        ? { stripeSubscriptionId: subscriptionId }
        : customerId
          ? { stripeCustomerId: customerId }
          : undefined;

    if (!where) {
      throw new Error('Stripe subscription webhook cannot be matched to a tenant.');
    }

    const account = await this.prisma.billingAccount.update({
      where,
      data: {
        ...(customerId && { stripeCustomerId: customerId }),
        ...(subscriptionId && { stripeSubscriptionId: subscriptionId }),
        status,
        ...(currentPeriodEnd && { currentPeriodEnd }),
        ...(planKey && { planKey }),
      },
    });
    await this.invalidateTenantPlanLimits(account.tenantId);
  }

  private async reconcileInvoiceStatus(invoice: Record<string, unknown>, status: BillingStatus) {
    const customerId = this.stringFromExpandable(invoice.customer);
    const subscriptionId = this.stringFromExpandable(invoice.subscription);
    const currentPeriodEnd = this.dateFromInvoice(invoice);
    const where = subscriptionId
      ? { stripeSubscriptionId: subscriptionId }
      : customerId
        ? { stripeCustomerId: customerId }
        : undefined;

    if (!where) {
      throw new Error('Stripe invoice webhook cannot be matched to a tenant.');
    }

    const account = await this.prisma.billingAccount.update({
      where,
      data: {
        status,
        ...(currentPeriodEnd && { currentPeriodEnd }),
      },
    });
    await this.invalidateTenantPlanLimits(account.tenantId);
  }

  private stringFromExpandable(value: unknown) {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'id' in value) {
      const id = (value as { id?: unknown }).id;
      return typeof id === 'string' ? id : undefined;
    }
    return undefined;
  }

  private objectFromUnknown(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private dateFromUnix(value: unknown) {
    return typeof value === 'number' ? new Date(value * 1000) : undefined;
  }

  private dateFromInvoice(invoice: Record<string, unknown>) {
    const lines = this.objectFromUnknown(invoice.lines);
    const data = Array.isArray(lines.data) ? lines.data : [];
    const firstLine = this.objectFromUnknown(data[0]);
    const period = this.objectFromUnknown(firstLine.period);
    return this.dateFromUnix(period.end);
  }

  private validPlanKey(value: unknown) {
    return value === 'trial' || value === 'light' || value === 'pro' || value === 'premium'
      ? value
      : undefined;
  }

  private mapStripeSubscriptionStatus(status?: string): BillingStatus {
    switch (status) {
      case 'trialing':
        return BillingStatus.TRIALING;
      case 'active':
        return BillingStatus.ACTIVE;
      case 'past_due':
        return BillingStatus.PAST_DUE;
      case 'canceled':
        return BillingStatus.CANCELED;
      case 'unpaid':
        return BillingStatus.UNPAID;
      case 'incomplete':
      case 'incomplete_expired':
        return BillingStatus.INCOMPLETE;
      default:
        return BillingStatus.INCOMPLETE;
    }
  }
}
