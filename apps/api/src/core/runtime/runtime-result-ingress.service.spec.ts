import { RuntimeResultHandlerRegistry } from './runtime-result-handler.registry';
import { RuntimeResultIngressService } from './runtime-result-ingress.service';

describe('RuntimeResultIngressService', () => {
  const lifecycle = {
    getRequest: jest.fn(),
  };
  const registry = {
    resolve: jest.fn(),
  };
  const handler = {
    moduleSlug: 'pulse',
    handle: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    handler.handle.mockResolvedValue({ ok: true });
  });

  it('routes by the persisted execution request module, not by callback payload trust', async () => {
    lifecycle.getRequest.mockResolvedValue({
      id: 'exec-1',
      context: {
        tenantId: 'tenant-1',
        moduleSlug: 'pulse',
      },
      requestType: 'pulse.advance_flow',
      input: { contextPack: { module: 'pulse' } },
      requestedAt: '2026-05-16T12:00:00.000Z',
    });
    registry.resolve.mockReturnValue(handler);

    const service = new RuntimeResultIngressService(
      lifecycle as never,
      registry as unknown as RuntimeResultHandlerRegistry,
    );

    await expect(service.ingest({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      status: 'SUCCEEDED',
      output: { decisionSummary: 'ok' },
      traceId: 'trace-1',
    })).resolves.toEqual({ ok: true });

    expect(lifecycle.getRequest).toHaveBeenCalledWith('tenant-1', 'exec-1');
    expect(registry.resolve).toHaveBeenCalledWith('pulse');
    expect(handler.handle).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      status: 'SUCCEEDED',
      output: { decisionSummary: 'ok' },
      request: expect.objectContaining({
        context: expect.objectContaining({ moduleSlug: 'pulse' }),
      }),
    }));
  });
});
