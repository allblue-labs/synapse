import { ExecutionStatus, UsageMetricType } from '@prisma/client';
import { RuntimeUsageMeteringService } from './runtime-usage-metering.service';

describe('RuntimeUsageMeteringService', () => {
  const usage = {
    record: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('records a Synapse-owned AI call usage event from runtime provider metadata', async () => {
    usage.record.mockResolvedValue({ id: 'usage-1' });
    const service = new RuntimeUsageMeteringService(usage as never);

    await service.recordProviderCall({
      transport: 'http',
      request: {
        id: 'exec-1',
        requestType: 'pulse.advance_flow',
        context: {
          tenantId: 'tenant-1',
          moduleSlug: 'pulse',
          requestId: 'trace-1',
        },
        input: {},
        requestedAt: '2026-05-16T12:00:00.000Z',
      },
      response: {
        id: 'runtime-exec-1',
        tenantId: 'tenant-1',
        moduleSlug: 'pulse',
        status: ExecutionStatus.SUCCEEDED,
        completedAt: '2026-05-16T12:00:03.000Z',
        output: {
          provider: 'openai',
          model: 'gpt-4.1-mini',
          latencyMs: 1200,
          usage: {
            input_tokens: 100,
            output_tokens: 40,
            prompt: 'must not be stored',
            nested: {
              total_tokens: 140,
              apiKey: 'must not be stored',
            },
          },
          output: 'must not be stored',
        },
      },
    });

    expect(usage.record).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      moduleSlug: 'pulse',
      metricType: UsageMetricType.AI_CALL,
      quantity: 1,
      unit: 'provider_call',
      resourceType: 'ExecutionRequest',
      resourceId: 'exec-1',
      idempotencyKey: 'runtime-provider-call:tenant-1:exec-1',
      occurredAt: new Date('2026-05-16T12:00:03.000Z'),
      metadata: expect.objectContaining({
        source: 'synapse_runtime',
        transport: 'http',
        runtimeExecutionId: 'runtime-exec-1',
        requestType: 'pulse.advance_flow',
        provider: 'openai',
        model: 'gpt-4.1-mini',
        status: ExecutionStatus.SUCCEEDED,
        latencyMs: 1200,
        hasError: false,
        usage: {
          input_tokens: 100,
          output_tokens: 40,
          nested: {
            total_tokens: 140,
          },
        },
      }),
    }));
  });

  it('does not record usage when the runtime never reached a provider', async () => {
    const service = new RuntimeUsageMeteringService(usage as never);

    await service.recordProviderCall({
      transport: 'http',
      request: {
        id: 'exec-1',
        requestType: 'pulse.advance_flow',
        context: {
          tenantId: 'tenant-1',
          moduleSlug: 'pulse',
          requestId: 'trace-1',
        },
        input: {},
        requestedAt: '2026-05-16T12:00:00.000Z',
      },
      response: {
        id: 'runtime-exec-1',
        tenantId: 'tenant-1',
        moduleSlug: 'pulse',
        status: ExecutionStatus.FAILED,
        output: {},
        errorMessage: 'provider unavailable',
      },
    });

    expect(usage.record).not.toHaveBeenCalled();
  });
});
