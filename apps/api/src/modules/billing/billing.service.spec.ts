import {
  BillingPlanStatus,
  BillingStatus,
  ModuleCatalogStatus,
  ModulePurchaseStatus,
  StripeWebhookEventStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
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
      update: jest.fn(),
    },
    moduleCatalogItem: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    modulePurchase: {
      findUnique: jest.fn(),
    },
    stripeWebhookEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
}

function createService() {
  const prisma = createPrismaMock();
  const audit = {
    record: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test';
      if (key === 'STRIPE_BASE_URL') return 'https://stripe.test';
      if (key === 'STRIPE_API_VERSION') return '2026-02-25.preview';
      if (key === 'STRIPE_PRICE_LIGHT') return 'price_light_env';
      if (key === 'BILLING_REDIRECT_ALLOWED_ORIGINS') {
        return 'http://localhost:5001,http://127.0.0.1:5001';
      }
      return undefined;
    }),
  };
  return {
    prisma,
    audit,
    config,
    service: new BillingService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      config as unknown as ConfigService,
    ),
  };
}

function signStripePayload(event: unknown, secret = 'whsec_test') {
  const rawBody = Buffer.from(JSON.stringify(event));
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody.toString('utf8')}`)
    .digest('hex');

  return {
    rawBody,
    signatureHeader: `t=${timestamp},v1=${signature}`,
  };
}

describe('BillingService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

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
      storeVisible: true,
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
      storeVisible: true,
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
      storeVisible: true,
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
      storeVisible: true,
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

  it('creates a Stripe customer and subscription checkout session with tenant metadata', async () => {
    const { service, prisma, audit } = createService();
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify({ id: 'cus_123' })),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.test/session',
        })),
      });
    global.fetch = fetchMock as unknown as typeof fetch;
    prisma.billingPlan.findUnique
      .mockResolvedValueOnce({
        key: 'light',
        status: BillingPlanStatus.ACTIVE,
        commercialFeatureFlag: 'billing.plan.light.commercial',
        requiredPublicModules: 1,
        metadata: {},
      })
      .mockResolvedValueOnce({
        key: 'light',
        status: BillingPlanStatus.ACTIVE,
        commercialFeatureFlag: 'billing.plan.light.commercial',
        requiredPublicModules: 1,
      });
    prisma.billingFeatureFlag.findUnique.mockResolvedValue({ enabled: true });
    prisma.moduleCatalogItem.count.mockResolvedValue(1);
    prisma.billingAccount.findUnique.mockResolvedValue({
      tenantId: 'tenant_a',
      stripeCustomerId: null,
      tenant: { name: 'Tenant A' },
    });
    prisma.billingAccount.update.mockResolvedValue({ stripeCustomerId: 'cus_123' });

    await expect(service.createSubscriptionCheckoutSession({
      tenantId: 'tenant_a',
      actorUserId: 'user_1',
      actorEmail: 'owner@example.com',
      planKey: 'light',
      successUrl: 'http://localhost:5001/billing/success',
      cancelUrl: 'http://localhost:5001/billing/cancel',
    })).resolves.toEqual({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.test/session',
      stripeCustomerId: 'cus_123',
      planKey: 'light',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://stripe.test/v1/customers',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_test',
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      }),
    );
    const customerBody = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(customerBody.get('email')).toBe('owner@example.com');
    expect(customerBody.get('metadata[tenantId]')).toBe('tenant_a');

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://stripe.test/v1/checkout/sessions',
      expect.objectContaining({ method: 'POST' }),
    );
    const checkoutBody = fetchMock.mock.calls[1][1].body as URLSearchParams;
    expect(checkoutBody.get('mode')).toBe('subscription');
    expect(checkoutBody.get('customer')).toBe('cus_123');
    expect(checkoutBody.get('line_items[0][price]')).toBe('price_light_env');
    expect(checkoutBody.get('metadata[tenantId]')).toBe('tenant_a');
    expect(checkoutBody.get('subscription_data[metadata][synapse_plan_key]')).toBe('light');
    expect(prisma.billingAccount.update).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_a' },
      data: { stripeCustomerId: 'cus_123' },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.BILLING_STRIPE_CUSTOMER_CREATED,
        tenantId: 'tenant_a',
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.BILLING_STRIPE_CHECKOUT_CREATED,
        resourceId: 'cs_test_123',
      }),
    );
  });

  it('reuses an existing Stripe customer when creating subscription checkout', async () => {
    const { service, prisma } = createService();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(JSON.stringify({
        id: 'cs_test_existing',
        url: 'https://checkout.stripe.test/existing',
      })),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    prisma.billingPlan.findUnique
      .mockResolvedValueOnce({
        key: 'light',
        status: BillingPlanStatus.ACTIVE,
        commercialFeatureFlag: 'billing.plan.light.commercial',
        requiredPublicModules: 1,
        metadata: { stripePriceId: 'price_from_metadata' },
      })
      .mockResolvedValueOnce({
        key: 'light',
        status: BillingPlanStatus.ACTIVE,
        commercialFeatureFlag: 'billing.plan.light.commercial',
        requiredPublicModules: 1,
      });
    prisma.billingFeatureFlag.findUnique.mockResolvedValue({ enabled: true });
    prisma.moduleCatalogItem.count.mockResolvedValue(1);
    prisma.billingAccount.findUnique.mockResolvedValue({
      tenantId: 'tenant_a',
      stripeCustomerId: 'cus_existing',
      tenant: { name: 'Tenant A' },
    });

    await service.createSubscriptionCheckoutSession({
      tenantId: 'tenant_a',
      actorUserId: 'user_1',
      actorEmail: 'owner@example.com',
      planKey: 'light',
      successUrl: 'http://localhost:5001/billing/success',
      cancelUrl: 'http://localhost:5001/billing/cancel',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][1].body as URLSearchParams).get('customer'))
      .toBe('cus_existing');
    expect((fetchMock.mock.calls[0][1].body as URLSearchParams).get('line_items[0][price]'))
      .toBe('price_from_metadata');
  });

  it('rejects checkout for commercially inactive plans', async () => {
    const { service, prisma } = createService();
    prisma.billingPlan.findUnique.mockResolvedValue({
      key: 'pro',
      status: BillingPlanStatus.ACTIVE,
      commercialFeatureFlag: 'billing.plan.pro.commercial',
      requiredPublicModules: 2,
      metadata: { stripePriceId: 'price_pro' },
    });
    prisma.billingFeatureFlag.findUnique.mockResolvedValue({ enabled: false });

    await expect(service.createSubscriptionCheckoutSession({
      tenantId: 'tenant_a',
      actorEmail: 'owner@example.com',
      planKey: 'pro',
      successUrl: 'http://localhost:5001/billing/success',
      cancelUrl: 'http://localhost:5001/billing/cancel',
    })).rejects.toThrow('Billing plan is not commercially active.');
  });

  it('rejects checkout redirect URLs outside allowed billing origins', async () => {
    const { service } = createService();

    await expect(service.createSubscriptionCheckoutSession({
      tenantId: 'tenant_a',
      actorEmail: 'owner@example.com',
      planKey: 'light',
      successUrl: 'https://evil.example/billing/success',
      cancelUrl: 'http://localhost:5001/billing/cancel',
    })).rejects.toThrow('Billing redirect URL origin is not allowed.');
  });

  it('creates Stripe customer portal sessions for tenant-owned customers', async () => {
    const { service, prisma, audit } = createService();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(JSON.stringify({
        id: 'bps_123',
        url: 'https://billing.stripe.test/session',
      })),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    prisma.billingAccount.findUnique.mockResolvedValue({
      tenantId: 'tenant_a',
      stripeCustomerId: 'cus_123',
    });

    await expect(service.createPortalSession({
      tenantId: 'tenant_a',
      actorUserId: 'user_1',
      returnUrl: 'http://localhost:5001/billing',
    })).resolves.toEqual({
      id: 'bps_123',
      url: 'https://billing.stripe.test/session',
      stripeCustomerId: 'cus_123',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://stripe.test/v1/billing_portal/sessions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_test',
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      }),
    );
    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get('customer')).toBe('cus_123');
    expect(body.get('return_url')).toBe('http://localhost:5001/billing');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.BILLING_STRIPE_PORTAL_CREATED,
        tenantId: 'tenant_a',
        resourceId: 'bps_123',
      }),
    );
  });

  it('rejects portal sessions when the tenant has no Stripe customer', async () => {
    const { service, prisma } = createService();
    prisma.billingAccount.findUnique.mockResolvedValue({
      tenantId: 'tenant_a',
      stripeCustomerId: null,
    });

    await expect(service.createPortalSession({
      tenantId: 'tenant_a',
      returnUrl: 'http://localhost:5001/billing',
    })).rejects.toThrow('Billing account does not have a Stripe customer.');
  });

  it('rejects portal return URLs outside allowed billing origins', async () => {
    const { service } = createService();

    await expect(service.createPortalSession({
      tenantId: 'tenant_a',
      returnUrl: 'https://evil.example/billing',
    })).rejects.toThrow('Billing redirect URL origin is not allowed.');
  });

  it('processes signed subscription webhooks and reconciles billing account state', async () => {
    const { service, prisma, audit } = createService();
    const currentPeriodEnd = Math.floor(Date.now() / 1000) + 86_400;
    const event = {
      id: 'evt_subscription_active',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'active',
          current_period_end: currentPeriodEnd,
          metadata: {
            tenantId: 'tenant_a',
            synapse_plan_key: 'pro',
          },
        },
      },
    };
    const signed = signStripePayload(event);
    prisma.stripeWebhookEvent.findUnique.mockResolvedValue(null);
    prisma.billingAccount.update.mockResolvedValue({});
    prisma.stripeWebhookEvent.create.mockResolvedValue({
      id: 'webhook_1',
      status: StripeWebhookEventStatus.PROCESSED,
      errorMessage: null,
    });

    await expect(
      service.processStripeWebhook(signed.rawBody, signed.signatureHeader),
    ).resolves.toEqual({
      received: true,
      duplicate: false,
      eventId: 'evt_subscription_active',
      status: StripeWebhookEventStatus.PROCESSED,
    });

    expect(prisma.billingAccount.update).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_a' },
      data: expect.objectContaining({
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        status: BillingStatus.ACTIVE,
        planKey: 'pro',
      }),
    });
    expect(prisma.billingAccount.update.mock.calls[0][0].data.currentPeriodEnd)
      .toEqual(new Date(currentPeriodEnd * 1000));
    expect(prisma.stripeWebhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stripeEventId: 'evt_subscription_active',
        eventType: 'customer.subscription.updated',
        status: StripeWebhookEventStatus.PROCESSED,
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.BILLING_STRIPE_WEBHOOK_PROCESSED,
        resourceType: 'StripeWebhookEvent',
        resourceId: 'webhook_1',
      }),
    );
  });

  it('deduplicates already recorded Stripe webhook events', async () => {
    const { service, prisma } = createService();
    const signed = signStripePayload({
      id: 'evt_duplicate',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_123' } },
    });
    prisma.stripeWebhookEvent.findUnique.mockResolvedValue({
      stripeEventId: 'evt_duplicate',
      status: StripeWebhookEventStatus.PROCESSED,
    });

    await expect(
      service.processStripeWebhook(signed.rawBody, signed.signatureHeader),
    ).resolves.toEqual({
      received: true,
      duplicate: true,
      eventId: 'evt_duplicate',
      status: StripeWebhookEventStatus.PROCESSED,
    });
    expect(prisma.billingAccount.update).not.toHaveBeenCalled();
    expect(prisma.stripeWebhookEvent.create).not.toHaveBeenCalled();
  });

  it('rejects webhooks with invalid signatures', async () => {
    const { service } = createService();
    const signed = signStripePayload({
      id: 'evt_bad_signature',
      type: 'invoice.payment_failed',
    });

    await expect(
      service.processStripeWebhook(signed.rawBody, 't=1,v1=bad'),
    ).rejects.toThrow('Stripe webhook signature timestamp is outside tolerance.');
  });

  it('maps failed invoice webhooks to past due accounts', async () => {
    const { service, prisma } = createService();
    const periodEnd = Math.floor(Date.now() / 1000) + 3_600;
    const signed = signStripePayload({
      id: 'evt_invoice_failed',
      type: 'invoice.payment_failed',
      data: {
        object: {
          customer: 'cus_123',
          subscription: 'sub_123',
          lines: {
            data: [{ period: { end: periodEnd } }],
          },
        },
      },
    });
    prisma.stripeWebhookEvent.findUnique.mockResolvedValue(null);
    prisma.billingAccount.update.mockResolvedValue({});
    prisma.stripeWebhookEvent.create.mockResolvedValue({
      id: 'webhook_2',
      status: StripeWebhookEventStatus.PROCESSED,
      errorMessage: null,
    });

    await service.processStripeWebhook(signed.rawBody, signed.signatureHeader);

    expect(prisma.billingAccount.update).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: 'sub_123' },
      data: {
        status: BillingStatus.PAST_DUE,
        currentPeriodEnd: new Date(periodEnd * 1000),
      },
    });
  });
});
