import { Injectable } from '@nestjs/common';
import { Prisma, UsageMetricType } from '@prisma/client';
import type { ExecutionRequestContract, ExecutionResponseContract } from '@synapse/contracts';
import { UsageMeteringService } from '../../modules/usage/usage-metering.service';

@Injectable()
export class RuntimeUsageMeteringService {
  constructor(private readonly usage: UsageMeteringService) {}

  async recordProviderCall(input: {
    request: ExecutionRequestContract;
    response: ExecutionResponseContract;
    transport: string;
  }) {
    const output = this.objectValue(input.response.output);
    if (!output) {
      return undefined;
    }
    const provider = this.stringValue(output.provider);
    if (!provider) {
      return undefined;
    }
    const model = this.stringValue(output.model);
    const latencyMs = this.numberValue(output.latencyMs);
    const providerUsage = this.auditSafeObject(output.usage);
    const metadata: Record<string, Prisma.InputJsonValue> = {
      source: 'synapse_runtime',
      transport: input.transport,
      runtimeExecutionId: input.response.id,
      requestType: input.request.requestType,
      provider,
      status: input.response.status,
      hasError: Boolean(input.response.errorMessage),
    };
    if (model) {
      metadata.model = model;
    }
    if (latencyMs !== undefined) {
      metadata.latencyMs = latencyMs;
    }
    if (providerUsage) {
      metadata.usage = providerUsage;
    }

    return this.usage.record({
      tenantId: input.request.context.tenantId,
      moduleSlug: input.request.context.moduleSlug,
      metricType: UsageMetricType.AI_CALL,
      quantity: 1,
      unit: 'provider_call',
      resourceType: 'ExecutionRequest',
      resourceId: input.request.id,
      idempotencyKey: [
        'runtime-provider-call',
        input.request.context.tenantId,
        input.request.id,
      ].join(':'),
      occurredAt: this.dateValue(input.response.completedAt) ?? new Date(),
      metadata: metadata as Prisma.InputJsonObject,
    });
  }

  private objectValue(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    return value as Record<string, unknown>;
  }

  private auditSafeObject(value: unknown, depth = 0): Prisma.InputJsonObject | undefined {
    const source = this.objectValue(value);
    if (!source || depth > 3) {
      return undefined;
    }

    const safeEntries = Object.entries(source)
      .filter(([key]) => !this.isSensitiveKey(key))
      .map(([key, entry]) => [key, this.auditSafeValue(entry, depth + 1)])
      .filter(([, entry]) => entry !== undefined);

    return Object.fromEntries(safeEntries) as Prisma.InputJsonObject;
  }

  private auditSafeValue(value: unknown, depth: number): Prisma.InputJsonValue | undefined {
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    if (value === null) {
      return undefined;
    }
    if (typeof value === 'string') {
      return value.length > 120 ? `${value.slice(0, 120)}...` : value;
    }
    if (Array.isArray(value)) {
      return value
        .slice(0, 10)
        .map((entry) => this.auditSafeValue(entry, depth + 1))
        .filter((entry): entry is Prisma.InputJsonValue => entry !== undefined);
    }
    return this.auditSafeObject(value, depth);
  }

  private isSensitiveKey(key: string) {
    return /secret|api[_-]?key|authorization|password|prompt|message|content/i.test(key);
  }

  private stringValue(value: unknown) {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }

  private numberValue(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private dateValue(value: unknown) {
    if (typeof value !== 'string') {
      return undefined;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
}
