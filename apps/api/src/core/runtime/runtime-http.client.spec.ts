import { RuntimeHttpClient } from './runtime-http.client';
import { RuntimeSignatureHeaders } from './runtime-signature.service';

describe('RuntimeHttpClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('submits signed execution requests to the isolated runtime', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        executionId: 'runtime-exec-1',
        tenantId: 'tenant-a',
        provider: 'openai',
        model: 'gpt-4.1-mini',
        output: 'done',
        status: 'succeeded',
        startedAt: '2026-05-08T10:00:00.000Z',
        completedAt: '2026-05-08T10:00:01.000Z',
      }),
    });
    global.fetch = fetchMock as never;
    const client = new RuntimeHttpClient(
      { get: (key: string) => key === 'SYNAPSE_RUNTIME_URL' ? 'https://runtime.test/' : undefined } as never,
      { sign: jest.fn().mockReturnValue({
        [RuntimeSignatureHeaders.KEY_ID]: 'platform',
        [RuntimeSignatureHeaders.TIMESTAMP]: '1778241600',
        [RuntimeSignatureHeaders.SIGNATURE]: 'sha256=test',
      }) } as never,
    );

    const result = await client.submit({
      id: 'exec-1',
      context: {
        tenantId: 'tenant-a',
        moduleSlug: 'pulse',
        actorUserId: 'user-1',
        permissions: ['runtime:executions:create'],
        requestId: 'req-1',
      },
      requestType: 'pulse.knowledge.query',
      input: {
        input: { prompt: 'Summarize safely.' },
        providerPreference: ['openai'],
        timeoutMs: 1000,
      },
      requestedAt: '2026-05-08T09:59:00.000Z',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://runtime.test/executions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          [RuntimeSignatureHeaders.SIGNATURE]: 'sha256=test',
        }),
      }),
    );
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual(expect.objectContaining({
      tenantId: 'tenant-a',
      module: 'pulse',
      skill: 'pulse.knowledge.query',
      input: { prompt: 'Summarize safely.' },
    }));
    expect(result).toEqual(expect.objectContaining({
      id: 'runtime-exec-1',
      tenantId: 'tenant-a',
      moduleSlug: 'pulse',
      status: 'SUCCEEDED',
    }));
  });

  it('fails closed when runtime URL is missing', async () => {
    const client = new RuntimeHttpClient(
      { get: () => undefined } as never,
      { sign: jest.fn() } as never,
    );

    await expect(client.submit({
      id: 'exec-1',
      context: { tenantId: 'tenant-a', moduleSlug: 'pulse' },
      requestType: 'pulse.test',
      input: { input: { prompt: 'hello' } },
      requestedAt: '2026-05-08T09:59:00.000Z',
    })).rejects.toThrow('Synapse Runtime URL is not configured.');
  });
});
