import { PulseRuntimeResultHandler } from './pulse-runtime-result.handler';

describe('PulseRuntimeResultHandler', () => {
  const registry = {
    register: jest.fn(),
  };
  const ingest = {
    execute: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('registers Pulse as a module result handler through Synapse runtime contracts', () => {
    const handler = new PulseRuntimeResultHandler(registry as never, ingest as never);

    handler.onModuleInit();

    expect(handler.moduleSlug).toBe('pulse');
    expect(registry.register).toHaveBeenCalledWith(handler);
  });

  it('delegates runtime results to Pulse ingestion without knowing runtime transport details', async () => {
    ingest.execute.mockResolvedValue({ ok: true });
    const handler = new PulseRuntimeResultHandler(registry as never, ingest as never);

    await expect(handler.handle({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      status: 'SUCCEEDED',
      output: { decisionSummary: 'ok' },
      traceId: 'trace-1',
      request: {
        id: 'exec-1',
        context: { tenantId: 'tenant-1', moduleSlug: 'pulse' },
        requestType: 'pulse.advance_flow',
        input: { contextPack: { module: 'pulse' } },
        requestedAt: '2026-05-16T12:00:00.000Z',
      },
    })).resolves.toEqual({ ok: true });

    expect(ingest.execute).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      status: 'SUCCEEDED',
      output: { decisionSummary: 'ok' },
      errorMessage: undefined,
      traceId: 'trace-1',
    });
  });
});
