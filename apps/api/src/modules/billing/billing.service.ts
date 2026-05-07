import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingPlanStatus,
  BillingStatus,
  ModuleCatalogStatus,
  ModulePurchaseStatus,
  Prisma,
  StripeWebhookEventStatus,
} from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { BillingCheckoutSession, BillingPlanKey } from '@synapse/contracts';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditAction, AuditService } from '../../common/audit/audit.service';

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

type StripeCustomerResponse = {
  id?: string;
};

type StripeCheckoutSessionResponse = {
  id?: string;
  url?: string | null;
};

@Injectable()
export class BillingService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
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

  async createSubscriptionCheckoutSession(
    input: CreateSubscriptionCheckoutSessionInput,
  ): Promise<BillingCheckoutSession> {
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

  private stripePriceIdForPlan(plan: { key: string; metadata: Prisma.JsonValue }) {
    const metadata = this.objectFromUnknown(plan.metadata);
    const metadataPrice = metadata.stripePriceId;
    if (typeof metadataPrice === 'string' && metadataPrice.trim()) {
      return metadataPrice;
    }

    return this.config.get<string>(`STRIPE_PRICE_${plan.key.toUpperCase()}`) || undefined;
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

    await this.prisma.billingAccount.update({
      where,
      data: {
        ...(customerId && { stripeCustomerId: customerId }),
        ...(subscriptionId && { stripeSubscriptionId: subscriptionId }),
        status,
        ...(currentPeriodEnd && { currentPeriodEnd }),
        ...(planKey && { planKey }),
      },
    });
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

    await this.prisma.billingAccount.update({
      where,
      data: {
        status,
        ...(currentPeriodEnd && { currentPeriodEnd }),
      },
    });
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
    return value === 'light' || value === 'pro' || value === 'premium'
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
