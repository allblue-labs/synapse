import { BadRequestException } from '@nestjs/common';
import { ExecutionStatus } from '@prisma/client';
import { RuntimeExecutionDispatchService } from './runtime-execution-dispatch.service';

describe('RuntimeExecutionDispatchService', () => {
  const lifecycle = {
    get: jest.fn(),
    getRequest: jest.fn(),
    transition: jest.fn(),
  };
  const runtime = {
    transport: 'http',
    submit: jest.fn(),
  };
  const usage = {
    recordProviderCall: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('is the Synapse-owned boundary that submits queued executions to the Go Runtime', async () => {
    lifecycle.get.mockResolvedValue({ id: 'exec-1', status: ExecutionStatus.QUEUED });
    lifecycle.getRequest.mockResolvedValue({
      id: 'exec-1',
      context: {
        tenantId: 'tenant-1',
        moduleSlug: 'pulse',
        requestId: 'trace-1',
      },
      requestType: 'pulse.advance_flow',
      input: {
        contextPack: {
          module: 'pulse',
          executionType: 'advance_flow',
          requiredOutputSchema: {
            type: 'object',
            properties: { decisionSummary: { type: 'string' } },
          },
        },
      },
      requestedAt: '2026-05-16T12:00:00.000Z',
    });
    lifecycle.transition.mockResolvedValue({ id: 'exec-1', status: ExecutionStatus.RUNNING });
    runtime.submit.mockResolvedValue({
      id: 'runtime-exec-1',
      tenantId: 'tenant-1',
      moduleSlug: 'pulse',
      status: ExecutionStatus.SUCCEEDED,
      output: { structuredPayload: { decisionSummary: 'ok' } },
    });

    const service = new RuntimeExecutionDispatchService(
      lifecycle as never,
      runtime as never,
      usage as never,
    );
    const result = await service.dispatchQueued({ tenantId: 'tenant-1', executionId: 'exec-1' });

    expect(lifecycle.transition).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      executionId: 'exec-1',
      status: ExecutionStatus.RUNNING,
      output: {
        dispatch: {
          providerCalls: true,
          transport: 'http',
          stage: 'runtime_dispatch_started',
        },
      },
    });
    expect(runtime.submit).toHaveBeenCalledWith(expect.objectContaining({
      id: 'exec-1',
      input: expect.objectContaining({
        providerPreference: ['openai', 'claude'],
        structuredOutput: expect.objectContaining({
          format: 'json_schema',
          schema: expect.objectContaining({ type: 'object' }),
        }),
        input: {
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('"module":"pulse"'),
            }),
          ]),
        },
      }),
    }));
    expect(usage.recordProviderCall).toHaveBeenCalledWith({
      request: expect.objectContaining({ id: 'exec-1' }),
      response: expect.objectContaining({ id: 'runtime-exec-1' }),
      transport: 'http',
    });
    expect(result).toEqual(expect.objectContaining({
      transport: 'http',
      response: expect.objectContaining({ status: ExecutionStatus.SUCCEEDED }),
    }));
  });

  it('rejects dispatch before touching the runtime when execution is not queued', async () => {
    lifecycle.get.mockResolvedValue({ id: 'exec-1', status: ExecutionStatus.SUCCEEDED });
    const service = new RuntimeExecutionDispatchService(
      lifecycle as never,
      runtime as never,
      usage as never,
    );

    await expect(service.dispatchQueued({ tenantId: 'tenant-1', executionId: 'exec-1' }))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(lifecycle.getRequest).not.toHaveBeenCalled();
    expect(lifecycle.transition).not.toHaveBeenCalled();
    expect(runtime.submit).not.toHaveBeenCalled();
    expect(usage.recordProviderCall).not.toHaveBeenCalled();
  });
});
