import { UsageMetricType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UsageMeteringService } from './usage-metering.service';

function createPrismaMock() {
  return {
    usageEvent: {
      create: jest.fn(),
      upsert: jest.fn(),
      groupBy: jest.fn(),
    },
  };
}

describe('UsageMeteringService', () => {
  it('creates append-only usage events without an idempotency key', async () => {
    const prisma = createPrismaMock();
    prisma.usageEvent.create.mockResolvedValue({});
    const service = new UsageMeteringService(prisma as unknown as PrismaService);
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
    const service = new UsageMeteringService(prisma as unknown as PrismaService);

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
    const service = new UsageMeteringService(prisma as unknown as PrismaService);

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
});
