import { createHmac } from 'crypto';
import { RuntimeSignatureHeaders, RuntimeSignatureService } from './runtime-signature.service';

describe('RuntimeSignatureService', () => {
  it('signs requests with the runtime canonical format', () => {
    const service = new RuntimeSignatureService({
      get: (key: string) => ({
        SYNAPSE_RUNTIME_SHARED_SECRET: 'secret',
        SYNAPSE_RUNTIME_KEY_ID: 'platform',
      })[key],
    } as never);

    const body = '{"tenantId":"tenant-a"}';
    const headers = service.sign({
      method: 'POST',
      path: '/executions',
      body,
      timestamp: 1778241600,
    });
    const expected = createHmac('sha256', 'secret')
      .update(`POST\n/executions\n1778241600\n${body}`)
      .digest('hex');

    expect(headers).toEqual({
      [RuntimeSignatureHeaders.KEY_ID]: 'platform',
      [RuntimeSignatureHeaders.TIMESTAMP]: '1778241600',
      [RuntimeSignatureHeaders.SIGNATURE]: `sha256=${expected}`,
    });
  });

  it('fails closed when the shared secret is missing', () => {
    const service = new RuntimeSignatureService({
      get: () => undefined,
    } as never);

    expect(() => service.sign({
      method: 'POST',
      path: '/executions',
      body: '{}',
    })).toThrow('Synapse Runtime shared secret is not configured.');
  });

  it('accepts valid signed runtime requests', () => {
    const service = new RuntimeSignatureService({
      get: (key: string) => ({
        SYNAPSE_RUNTIME_SHARED_SECRET: 'secretsecretsecretsecretsecretsecret12',
        SYNAPSE_RUNTIME_KEY_ID: 'platform',
        SYNAPSE_RUNTIME_SIGNATURE_TOLERANCE_SECONDS: 300,
      })[key],
    } as never);
    const body = '{"status":"SUCCEEDED"}';
    const headers = service.sign({
      method: 'POST',
      path: '/v1/pulse/runtime/results',
      body,
      timestamp: 1778241600,
    });

    expect(() => service.assertValid({
      method: 'POST',
      path: '/v1/pulse/runtime/results',
      body,
      headers,
      now: 1778241600,
    })).not.toThrow();
  });

  it('rejects invalid or stale signed runtime requests', () => {
    const service = new RuntimeSignatureService({
      get: (key: string) => ({
        SYNAPSE_RUNTIME_SHARED_SECRET: 'secretsecretsecretsecretsecretsecret12',
        SYNAPSE_RUNTIME_KEY_ID: 'platform',
        SYNAPSE_RUNTIME_SIGNATURE_TOLERANCE_SECONDS: 300,
      })[key],
    } as never);
    const body = '{"status":"SUCCEEDED"}';
    const headers = service.sign({
      method: 'POST',
      path: '/v1/pulse/runtime/results',
      body,
      timestamp: 1778241600,
    });

    expect(() => service.assertValid({
      method: 'POST',
      path: '/v1/pulse/runtime/results',
      body: '{"status":"FAILED"}',
      headers,
      now: 1778241600,
    })).toThrow('Runtime signature is invalid.');

    expect(() => service.assertValid({
      method: 'POST',
      path: '/v1/pulse/runtime/results',
      body,
      headers,
      now: 1778242201,
    })).toThrow('Runtime signature timestamp is outside the allowed window.');
  });
});
