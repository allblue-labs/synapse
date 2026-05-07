import { Injectable } from '@nestjs/common';
import { Prisma, UsageMetricType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export { UsageMetricType };

export interface RecordUsageInput {
  tenantId: string;
  metricType: UsageMetricType;
  unit: string;
  quantity?: number | Prisma.Decimal;
  moduleSlug?: string;
  resourceType?: string;
  resourceId?: string;
  idempotencyKey?: string;
  occurredAt?: Date;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class UsageMeteringService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordUsageInput) {
    const occurredAt = input.occurredAt ?? new Date();
    const data = {
      tenantId: input.tenantId,
      moduleSlug: input.moduleSlug,
      metricType: input.metricType,
      quantity: input.quantity ?? 1,
      unit: input.unit,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      idempotencyKey: input.idempotencyKey,
      billingPeriod: this.billingPeriodFor(occurredAt),
      metadata: input.metadata ?? {},
      occurredAt,
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

  async summarizeTenantPeriod(tenantId: string, billingPeriod: string) {
    const grouped = await this.prisma.usageEvent.groupBy({
      by: ['metricType', 'unit'],
      where: { tenantId, billingPeriod },
      _sum: { quantity: true },
      _count: { _all: true },
    });

    return grouped.map((row) => ({
      metricType: row.metricType,
      unit: row.unit,
      quantity: row._sum.quantity?.toString() ?? '0',
      events: row._count._all,
    }));
  }

  billingPeriodFor(date: Date) {
    return date.toISOString().slice(0, 7);
  }
}
