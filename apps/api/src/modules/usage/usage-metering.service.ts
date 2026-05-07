import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UsageMetricType, UsageStripeReportStatus } from '@prisma/client';
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

export interface SetUsageRateInput {
  metricType: UsageMetricType;
  unit: string;
  unitPriceCents: number | Prisma.Decimal;
  currency?: string;
  active?: boolean;
  metadata?: Prisma.InputJsonValue;
}

export interface SetStripeMeterInput {
  metricType: UsageMetricType;
  unit: string;
  stripeEventName: string;
  currency?: string;
  valueMultiplier?: number | Prisma.Decimal;
  active?: boolean;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class UsageMeteringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

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

  async listRates() {
    return this.prisma.usageRate.findMany({
      orderBy: [{ metricType: 'asc' }, { unit: 'asc' }, { currency: 'asc' }],
    });
  }

  async setRate(input: SetUsageRateInput) {
    const currency = (input.currency ?? 'usd').toLowerCase();
    return this.prisma.usageRate.upsert({
      where: {
        metricType_unit_currency: {
          metricType: input.metricType,
          unit: input.unit,
          currency,
        },
      },
      create: {
        metricType: input.metricType,
        unit: input.unit,
        unitPriceCents: input.unitPriceCents,
        currency,
        active: input.active ?? true,
        metadata: input.metadata ?? {},
      },
      update: {
        unitPriceCents: input.unitPriceCents,
        active: input.active ?? true,
        metadata: input.metadata ?? {},
      },
    });
  }

  async listStripeMeters() {
    return this.prisma.usageStripeMeter.findMany({
      orderBy: [{ metricType: 'asc' }, { unit: 'asc' }, { currency: 'asc' }],
    });
  }

  async setStripeMeter(input: SetStripeMeterInput) {
    const currency = (input.currency ?? 'usd').toLowerCase();
    return this.prisma.usageStripeMeter.upsert({
      where: {
        metricType_unit_currency: {
          metricType: input.metricType,
          unit: input.unit,
          currency,
        },
      },
      create: {
        metricType: input.metricType,
        unit: input.unit,
        currency,
        stripeEventName: input.stripeEventName,
        valueMultiplier: input.valueMultiplier ?? 1,
        active: input.active ?? true,
        metadata: input.metadata ?? {},
      },
      update: {
        stripeEventName: input.stripeEventName,
        valueMultiplier: input.valueMultiplier ?? 1,
        active: input.active ?? true,
        metadata: input.metadata ?? {},
      },
    });
  }

  async rateTenantPeriod(tenantId: string, billingPeriod: string, currency = 'usd') {
    const normalizedCurrency = currency.toLowerCase();
    const summary = await this.summarizeTenantPeriod(tenantId, billingPeriod);
    const rates = await this.prisma.usageRate.findMany({
      where: {
        currency: normalizedCurrency,
        active: true,
      },
    });
    const rateByMetricUnit = new Map(
      rates.map((rate) => [`${rate.metricType}:${rate.unit}`, rate]),
    );

    const calculatedAt = new Date();
    const lines = await Promise.all(
      summary.map((line) => {
        const rate = rateByMetricUnit.get(`${line.metricType}:${line.unit}`);
        const quantity = new Prisma.Decimal(line.quantity);
        const amountCents = rate ? quantity.mul(rate.unitPriceCents) : null;

        return this.prisma.usagePeriodAggregate.upsert({
          where: {
            tenantId_billingPeriod_metricType_unit_currency: {
              tenantId,
              billingPeriod,
              metricType: line.metricType,
              unit: line.unit,
              currency: normalizedCurrency,
            },
          },
          create: {
            tenantId,
            billingPeriod,
            metricType: line.metricType,
            unit: line.unit,
            quantity,
            events: line.events,
            currency: normalizedCurrency,
            unitPriceCents: rate?.unitPriceCents,
            amountCents,
            rated: !!rate,
            calculatedAt,
          },
          update: {
            quantity,
            events: line.events,
            unitPriceCents: rate?.unitPriceCents,
            amountCents,
            rated: !!rate,
            calculatedAt,
          },
        });
      }),
    );

    return {
      tenantId,
      billingPeriod,
      currency: normalizedCurrency,
      totalAmountCents: lines
        .reduce(
          (total, line) => total.add(line.amountCents ?? 0),
          new Prisma.Decimal(0),
        )
        .toString(),
      lines: lines.map((line) => ({
        metricType: line.metricType,
        unit: line.unit,
        quantity: line.quantity.toString(),
        events: line.events,
        unitPriceCents: line.unitPriceCents?.toString() ?? null,
        amountCents: line.amountCents?.toString() ?? null,
        rated: line.rated,
      })),
    };
  }

  async reportTenantPeriodToStripe(tenantId: string, billingPeriod: string, currency = 'usd') {
    const normalizedCurrency = currency.toLowerCase();
    await this.rateTenantPeriod(tenantId, billingPeriod, normalizedCurrency);

    const account = await this.prisma.billingAccount.findUnique({
      where: { tenantId },
    });

    const aggregates = await this.prisma.usagePeriodAggregate.findMany({
      where: { tenantId, billingPeriod, currency: normalizedCurrency },
      include: { stripeReports: true },
      orderBy: [{ metricType: 'asc' }, { unit: 'asc' }],
    });

    const meters = await this.prisma.usageStripeMeter.findMany({
      where: { currency: normalizedCurrency, active: true },
    });
    const meterByMetricUnit = new Map(
      meters.map((meter) => [`${meter.metricType}:${meter.unit}`, meter]),
    );

    const reports = [];
    for (const aggregate of aggregates) {
      if (aggregate.stripeReports.some((report) => report.status === UsageStripeReportStatus.SENT)) {
        reports.push(aggregate.stripeReports.find((report) => report.status === UsageStripeReportStatus.SENT));
        continue;
      }

      const meter = meterByMetricUnit.get(`${aggregate.metricType}:${aggregate.unit}`);
      if (!account?.stripeCustomerId) {
        reports.push(await this.upsertStripeReport(aggregate.id, tenantId, {
          status: UsageStripeReportStatus.SKIPPED,
          errorMessage: 'Tenant billing account has no Stripe customer id.',
        }));
        continue;
      }

      if (!aggregate.rated) {
        reports.push(await this.upsertStripeReport(aggregate.id, tenantId, {
          status: UsageStripeReportStatus.SKIPPED,
          errorMessage: 'Usage aggregate is unrated.',
        }));
        continue;
      }

      if (!meter) {
        reports.push(await this.upsertStripeReport(aggregate.id, tenantId, {
          status: UsageStripeReportStatus.SKIPPED,
          errorMessage: 'No active Stripe meter mapping for aggregate metric/unit.',
        }));
        continue;
      }

      const value = this.toStripeIntegerValue(aggregate.quantity, meter.valueMultiplier);
      if (value <= 0) {
        reports.push(await this.upsertStripeReport(aggregate.id, tenantId, {
          status: UsageStripeReportStatus.SKIPPED,
          stripeEventName: meter.stripeEventName,
          stripeCustomerId: account.stripeCustomerId,
          value,
          errorMessage: 'Stripe meter event value must be a positive integer.',
        }));
        continue;
      }

      const identifier = `usage:${aggregate.id}`;
      try {
        await this.createStripeMeterEvent({
          eventName: meter.stripeEventName,
          identifier,
          stripeCustomerId: account.stripeCustomerId,
          value,
          timestamp: aggregate.calculatedAt,
        });

        reports.push(await this.upsertStripeReport(aggregate.id, tenantId, {
          status: UsageStripeReportStatus.SENT,
          stripeEventName: meter.stripeEventName,
          stripeIdentifier: identifier,
          stripeCustomerId: account.stripeCustomerId,
          value,
          errorMessage: null,
          reportedAt: new Date(),
        }));
      } catch (err) {
        reports.push(await this.upsertStripeReport(aggregate.id, tenantId, {
          status: UsageStripeReportStatus.FAILED,
          stripeEventName: meter.stripeEventName,
          stripeIdentifier: identifier,
          stripeCustomerId: account.stripeCustomerId,
          value,
          errorMessage: err instanceof Error ? err.message : String(err),
        }));
      }
    }

    return {
      tenantId,
      billingPeriod,
      currency: normalizedCurrency,
      reports: reports.filter(Boolean).map((report) => ({
        aggregateId: report!.aggregateId,
        status: report!.status,
        stripeEventName: report!.stripeEventName,
        stripeIdentifier: report!.stripeIdentifier,
        stripeCustomerId: report!.stripeCustomerId,
        value: report!.value,
        errorMessage: report!.errorMessage,
        reportedAt: report!.reportedAt?.toISOString() ?? null,
      })),
    };
  }

  billingPeriodFor(date: Date) {
    return date.toISOString().slice(0, 7);
  }

  private toStripeIntegerValue(quantity: Prisma.Decimal, multiplier: Prisma.Decimal) {
    const value = quantity.mul(multiplier);
    if (!value.isInteger()) {
      return 0;
    }
    return value.toNumber();
  }

  private async upsertStripeReport(
    aggregateId: string,
    tenantId: string,
    data: {
      status: UsageStripeReportStatus;
      stripeEventName?: string | null;
      stripeIdentifier?: string | null;
      stripeCustomerId?: string | null;
      value?: number | null;
      errorMessage?: string | null;
      reportedAt?: Date | null;
    },
  ) {
    return this.prisma.usageStripeReport.upsert({
      where: { aggregateId },
      create: {
        aggregateId,
        tenantId,
        ...data,
      },
      update: data,
    });
  }

  private async createStripeMeterEvent(input: {
    eventName: string;
    identifier: string;
    stripeCustomerId: string;
    value: number;
    timestamp: Date;
  }) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new ServiceUnavailableException('Stripe secret key is not configured.');
    }

    const baseUrl = this.config.get<string>('STRIPE_BASE_URL') ?? 'https://api.stripe.com';
    const apiVersion = this.config.get<string>('STRIPE_API_VERSION') ?? '2026-02-25.preview';
    const response = await fetch(`${baseUrl}/v2/billing/meter_events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'Stripe-Version': apiVersion,
      },
      body: JSON.stringify({
        event_name: input.eventName,
        identifier: input.identifier,
        timestamp: input.timestamp.toISOString(),
        payload: {
          stripe_customer_id: input.stripeCustomerId,
          value: String(input.value),
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Stripe meter event failed (${response.status}): ${body}`);
    }

    return response.json();
  }
}
