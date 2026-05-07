import { Prisma, UsageMetricType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UsageMeteringService } from './usage-metering.service';

function createPrismaMock() {
  return {
    usageEvent: {
      create: jest.fn(),
      upsert: jest.fn(),
      groupBy: jest.fn(),
    },
    usageRate: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    usagePeriodAggregate: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    usageStripeMeter: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    usageStripeReport: {
      upsert: jest.fn(),
    },
    billingAccount: {
      findUnique: jest.fn(),
    },
  };
}

function createService(prisma = createPrismaMock(), env: Record<string, string | undefined> = {}) {
  const config = {
    get: jest.fn((key: string) => env[key]),
  };

  return {
    prisma,
    config,
    service: new UsageMeteringService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    ),
  };
}

describe('UsageMeteringService', () => {
  it('creates append-only usage events without an idempotency key', async () => {
    const prisma = createPrismaMock();
    prisma.usageEvent.create.mockResolvedValue({});
    const { service } = createService(prisma);
    const occurredAt = new Date('2026-05-07T12:00:00.000Z');

    await service.record({
      tenantId: 'tenant_a',
      moduleSlug: 'pulse',
      metricType: UsageMetricType.MESSAGE,
      quantity: 1,
      unit: 'message',
      occurredAt,
    });

    expect(prisma.usageEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant_a',
        moduleSlug: 'pulse',
        metricType: UsageMetricType.MESSAGE,
        quantity: 1,
        unit: 'message',
        billingPeriod: '2026-05',
        occurredAt,
      }),
    });
  });

  it('upserts by tenant and idempotency key when provided', async () => {
    const prisma = createPrismaMock();
    prisma.usageEvent.upsert.mockResolvedValue({});
    const { service } = createService(prisma);

    await service.record({
      tenantId: 'tenant_a',
      metricType: UsageMetricType.AI_CALL,
      unit: 'call',
      idempotencyKey: 'pulse-ai-extract:entry_1',
    });

    expect(prisma.usageEvent.upsert).toHaveBeenCalledWith({
      where: {
        tenantId_idempotencyKey: {
          tenantId: 'tenant_a',
          idempotencyKey: 'pulse-ai-extract:entry_1',
        },
      },
      create: expect.objectContaining({
        tenantId: 'tenant_a',
        metricType: UsageMetricType.AI_CALL,
        unit: 'call',
        idempotencyKey: 'pulse-ai-extract:entry_1',
      }),
      update: {},
    });
  });

  it('summarizes usage by metric and unit for a tenant billing period', async () => {
    const prisma = createPrismaMock();
    prisma.usageEvent.groupBy.mockResolvedValue([
      {
        metricType: UsageMetricType.AI_CALL,
        unit: 'call',
        _sum: { quantity: { toString: () => '3' } },
        _count: { _all: 3 },
      },
    ]);
    const { service } = createService(prisma);

    await expect(service.summarizeTenantPeriod('tenant_a', '2026-05')).resolves.toEqual([
      {
        metricType: UsageMetricType.AI_CALL,
        unit: 'call',
        quantity: '3',
        events: 3,
      },
    ]);
    expect(prisma.usageEvent.groupBy).toHaveBeenCalledWith({
      by: ['metricType', 'unit'],
      where: { tenantId: 'tenant_a', billingPeriod: '2026-05' },
      _sum: { quantity: true },
      _count: { _all: true },
    });
  });

  it('sets admin-managed usage rates by metric, unit, and currency', async () => {
    const prisma = createPrismaMock();
    prisma.usageRate.upsert.mockResolvedValue({});
    const { service } = createService(prisma);

    await service.setRate({
      metricType: UsageMetricType.AI_CALL,
      unit: 'call',
      unitPriceCents: 2.5,
      currency: 'USD',
    });

    expect(prisma.usageRate.upsert).toHaveBeenCalledWith({
      where: {
        metricType_unit_currency: {
          metricType: UsageMetricType.AI_CALL,
          unit: 'call',
          currency: 'usd',
        },
      },
      create: expect.objectContaining({
        metricType: UsageMetricType.AI_CALL,
        unit: 'call',
        unitPriceCents: 2.5,
        currency: 'usd',
        active: true,
      }),
      update: expect.objectContaining({
        unitPriceCents: 2.5,
        active: true,
      }),
    });
  });

  it('rates tenant period usage with active rate cards and snapshots aggregates', async () => {
    const prisma = createPrismaMock();
    prisma.usageEvent.groupBy.mockResolvedValue([
      {
        metricType: UsageMetricType.AI_CALL,
        unit: 'call',
        _sum: { quantity: { toString: () => '3' } },
        _count: { _all: 3 },
      },
      {
        metricType: UsageMetricType.MESSAGE,
        unit: 'message',
        _sum: { quantity: { toString: () => '10' } },
        _count: { _all: 10 },
      },
    ]);
    prisma.usageRate.findMany.mockResolvedValue([
      {
        metricType: UsageMetricType.AI_CALL,
        unit: 'call',
        unitPriceCents: new Prisma.Decimal('2.5'),
      },
    ]);
    prisma.usagePeriodAggregate.upsert
      .mockResolvedValueOnce({
        metricType: UsageMetricType.AI_CALL,
        unit: 'call',
        quantity: { toString: () => '3' },
        events: 3,
        unitPriceCents: { toString: () => '2.5' },
        amountCents: new Prisma.Decimal('7.5'),
        rated: true,
      })
      .mockResolvedValueOnce({
        metricType: UsageMetricType.MESSAGE,
        unit: 'message',
        quantity: { toString: () => '10' },
        events: 10,
        unitPriceCents: null,
        amountCents: null,
        rated: false,
      });
    const { service } = createService(prisma);

    await expect(service.rateTenantPeriod('tenant_a', '2026-05')).resolves.toEqual({
      tenantId: 'tenant_a',
      billingPeriod: '2026-05',
      currency: 'usd',
      totalAmountCents: '7.5',
      lines: [
        {
          metricType: UsageMetricType.AI_CALL,
          unit: 'call',
          quantity: '3',
          events: 3,
          unitPriceCents: '2.5',
          amountCents: '7.5',
          rated: true,
        },
        {
          metricType: UsageMetricType.MESSAGE,
          unit: 'message',
          quantity: '10',
          events: 10,
          unitPriceCents: null,
          amountCents: null,
          rated: false,
        },
      ],
    });
    expect(prisma.usagePeriodAggregate.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.usageRate.findMany).toHaveBeenCalledWith({
      where: { currency: 'usd', active: true },
    });
  });

  it('sets Stripe meter mappings by metric, unit, and currency', async () => {
    const prisma = createPrismaMock();
    prisma.usageStripeMeter.upsert.mockResolvedValue({});
    const { service } = createService(prisma);

    await service.setStripeMeter({
      metricType: UsageMetricType.AI_CALL,
      unit: 'call',
      stripeEventName: 'synapse_ai_calls',
      valueMultiplier: 1,
      currency: 'USD',
    });

    expect(prisma.usageStripeMeter.upsert).toHaveBeenCalledWith({
      where: {
        metricType_unit_currency: {
          metricType: UsageMetricType.AI_CALL,
          unit: 'call',
          currency: 'usd',
        },
      },
      create: expect.objectContaining({
        metricType: UsageMetricType.AI_CALL,
        unit: 'call',
        stripeEventName: 'synapse_ai_calls',
        currency: 'usd',
        active: true,
      }),
      update: expect.objectContaining({
        stripeEventName: 'synapse_ai_calls',
        valueMultiplier: 1,
      }),
    });
  });

  it('reports rated aggregate lines to Stripe meter events', async () => {
    const prisma = createPrismaMock();
    prisma.usageEvent.groupBy.mockResolvedValue([]);
    prisma.usageRate.findMany.mockResolvedValue([]);
    prisma.billingAccount.findUnique.mockResolvedValue({
      stripeCustomerId: 'cus_123',
    });
    prisma.usagePeriodAggregate.findMany.mockResolvedValue([
      {
        id: 'agg_1',
        tenantId: 'tenant_a',
        billingPeriod: '2026-05',
        metricType: UsageMetricType.AI_CALL,
        unit: 'call',
        quantity: new Prisma.Decimal(3),
        rated: true,
        calculatedAt: new Date('2026-05-31T00:00:00.000Z'),
        stripeReports: [],
      },
    ]);
    prisma.usageStripeMeter.findMany.mockResolvedValue([
      {
        metricType: UsageMetricType.AI_CALL,
        unit: 'call',
        stripeEventName: 'synapse_ai_calls',
        valueMultiplier: new Prisma.Decimal(1),
      },
    ]);
    prisma.usageStripeReport.upsert.mockResolvedValue({
      aggregateId: 'agg_1',
      status: 'SENT',
      stripeEventName: 'synapse_ai_calls',
      stripeIdentifier: 'usage:agg_1',
      stripeCustomerId: 'cus_123',
      value: 3,
      errorMessage: null,
      reportedAt: new Date('2026-05-31T00:01:00.000Z'),
    });
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'meter_event_1' }),
    } as unknown as Response);
    const { service } = createService(prisma, {
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_BASE_URL: 'https://api.stripe.test',
      STRIPE_API_VERSION: '2026-02-25.preview',
    });

    await expect(service.reportTenantPeriodToStripe('tenant_a', '2026-05')).resolves.toEqual({
      tenantId: 'tenant_a',
      billingPeriod: '2026-05',
      currency: 'usd',
      reports: [
        expect.objectContaining({
          aggregateId: 'agg_1',
          status: 'SENT',
          stripeIdentifier: 'usage:agg_1',
          value: 3,
        }),
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.stripe.test/v2/billing/meter_events',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_test_123',
          'Stripe-Version': '2026-02-25.preview',
        }),
        body: JSON.stringify({
          event_name: 'synapse_ai_calls',
          identifier: 'usage:agg_1',
          timestamp: '2026-05-31T00:00:00.000Z',
          payload: {
            stripe_customer_id: 'cus_123',
            value: '3',
          },
        }),
      }),
    );
    fetchMock.mockRestore();
  });

  it('skips Stripe reporting when the tenant has no Stripe customer id', async () => {
    const prisma = createPrismaMock();
    prisma.usageEvent.groupBy.mockResolvedValue([]);
    prisma.usageRate.findMany.mockResolvedValue([]);
    prisma.billingAccount.findUnique.mockResolvedValue({ stripeCustomerId: null });
    prisma.usagePeriodAggregate.findMany.mockResolvedValue([
      {
        id: 'agg_1',
        tenantId: 'tenant_a',
        metricType: UsageMetricType.MESSAGE,
        unit: 'message',
        quantity: new Prisma.Decimal(10),
        rated: true,
        calculatedAt: new Date(),
        stripeReports: [],
      },
    ]);
    prisma.usageStripeMeter.findMany.mockResolvedValue([]);
    prisma.usageStripeReport.upsert.mockResolvedValue({
      aggregateId: 'agg_1',
      status: 'SKIPPED',
      stripeEventName: null,
      stripeIdentifier: null,
      stripeCustomerId: null,
      value: null,
      errorMessage: 'Tenant billing account has no Stripe customer id.',
      reportedAt: null,
    });
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    const { service } = createService(prisma);

    await expect(service.reportTenantPeriodToStripe('tenant_a', '2026-05')).resolves.toEqual(
      expect.objectContaining({
        reports: [
          expect.objectContaining({
            status: 'SKIPPED',
            errorMessage: 'Tenant billing account has no Stripe customer id.',
          }),
        ],
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});
