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
  const receipts = {
    claim: jest.fn(),
    markProcessed: jest.fn(),
    markFailed: jest.fn(),
  };
  const usage = {
    recordProviderCall: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    handler.handle.mockResolvedValue({ ok: true });
    receipts.claim.mockResolvedValue({
      receiptId: 'receipt-1',
      replay: false,
      status: 'RECEIVED',
    });
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
      receipts as never,
      usage as never,
    );

    await expect(service.ingest({
      dto: {
        tenantId: 'tenant-1',
        executionRequestId: 'exec-1',
        status: 'SUCCEEDED',
        output: { decisionSummary: 'ok' },
        traceId: 'trace-1',
      },
      rawBody: '{"ok":true}',
      signatureKeyId: 'platform',
      signatureTimestamp: '1778241600',
      signature: 'sha256=test',
    })).resolves.toEqual({ ok: true });

    expect(receipts.claim).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      resultStatus: 'SUCCEEDED',
      rawBody: '{"ok":true}',
      signatureKeyId: 'platform',
      signatureTimestamp: '1778241600',
      signature: 'sha256=test',
    });
    expect(lifecycle.getRequest).toHaveBeenCalledWith('tenant-1', 'exec-1');
    expect(registry.resolve).toHaveBeenCalledWith('pulse');
    expect(usage.recordProviderCall).toHaveBeenCalledWith({
      request: expect.objectContaining({ id: 'exec-1' }),
      response: expect.objectContaining({
        id: 'exec-1',
        tenantId: 'tenant-1',
        moduleSlug: 'pulse',
        status: 'SUCCEEDED',
        output: { decisionSummary: 'ok' },
      }),
      transport: 'http_callback',
    });
    expect(handler.handle).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      status: 'SUCCEEDED',
      output: { decisionSummary: 'ok' },
      request: expect.objectContaining({
        context: expect.objectContaining({ moduleSlug: 'pulse' }),
      }),
    }));
    expect(receipts.markProcessed).toHaveBeenCalledWith('receipt-1');
  });

  it('short-circuits replayed callbacks without invoking the module handler again', async () => {
    receipts.claim.mockResolvedValue({
      receiptId: 'receipt-1',
      replay: true,
      status: 'PROCESSED',
    });
    const service = new RuntimeResultIngressService(
      lifecycle as never,
      registry as unknown as RuntimeResultHandlerRegistry,
      receipts as never,
      usage as never,
    );

    await expect(service.ingest({
      dto: {
        tenantId: 'tenant-1',
        executionRequestId: 'exec-1',
        status: 'SUCCEEDED',
      },
      rawBody: '{"ok":true}',
      signatureKeyId: 'platform',
      signatureTimestamp: '1778241600',
      signature: 'sha256=test',
    })).resolves.toEqual({
      accepted: true,
      replay: true,
      receiptId: 'receipt-1',
      receiptStatus: 'PROCESSED',
    });

    expect(lifecycle.getRequest).toHaveBeenCalledWith('tenant-1', 'exec-1');
    expect(handler.handle).not.toHaveBeenCalled();
    expect(usage.recordProviderCall).not.toHaveBeenCalled();
    expect(receipts.markProcessed).not.toHaveBeenCalled();
  });

  it('marks receipts as failed when module handler rejects', async () => {
    lifecycle.getRequest.mockResolvedValue({
      id: 'exec-1',
      context: { tenantId: 'tenant-1', moduleSlug: 'pulse' },
      requestType: 'pulse.advance_flow',
      input: {},
      requestedAt: '2026-05-16T12:00:00.000Z',
    });
    registry.resolve.mockReturnValue(handler);
    handler.handle.mockRejectedValue(new Error('handler failed'));
    const service = new RuntimeResultIngressService(
      lifecycle as never,
      registry as unknown as RuntimeResultHandlerRegistry,
      receipts as never,
      usage as never,
    );

    await expect(service.ingest({
      dto: {
        tenantId: 'tenant-1',
        executionRequestId: 'exec-1',
        status: 'FAILED',
        errorMessage: 'provider failed',
      },
      rawBody: '{"ok":false}',
      signatureKeyId: 'platform',
      signatureTimestamp: '1778241600',
      signature: 'sha256=test',
    })).rejects.toThrow('handler failed');

    expect(receipts.markFailed).toHaveBeenCalledWith('receipt-1', expect.any(Error));
  });

  it('meters provider usage from the runtime envelope and sends only module output to handlers', async () => {
    lifecycle.getRequest.mockResolvedValue({
      id: 'exec-1',
      context: { tenantId: 'tenant-1', moduleSlug: 'pulse' },
      requestType: 'pulse.advance_flow',
      input: {},
      requestedAt: '2026-05-16T12:00:00.000Z',
    });
    registry.resolve.mockReturnValue(handler);
    const service = new RuntimeResultIngressService(
      lifecycle as never,
      registry as unknown as RuntimeResultHandlerRegistry,
      receipts as never,
      usage as never,
    );

    await service.ingest({
      dto: {
        tenantId: 'tenant-1',
        executionRequestId: 'exec-1',
        runtimeExecutionId: 'runtime-exec-1',
        status: 'SUCCEEDED',
        output: {
          provider: 'openai',
          model: 'gpt-4.1-mini',
          latencyMs: 1200,
          usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
          structuredPayload: {
            decisionSummary: 'Advance safely.',
            confidence: 0.9,
          },
        },
        traceId: 'trace-1',
      },
      rawBody: '{"ok":true}',
      signatureKeyId: 'platform',
      signatureTimestamp: '1778241600',
      signature: 'sha256=test',
    });

    expect(usage.recordProviderCall).toHaveBeenCalledWith({
      request: expect.objectContaining({ id: 'exec-1' }),
      response: expect.objectContaining({
        id: 'runtime-exec-1',
        output: expect.objectContaining({
          provider: 'openai',
          structuredPayload: expect.any(Object),
        }),
      }),
      transport: 'http_callback',
    });
    expect(handler.handle).toHaveBeenCalledWith(expect.objectContaining({
      output: {
        decisionSummary: 'Advance safely.',
        confidence: 0.9,
      },
    }));
  });
});
