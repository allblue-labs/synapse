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
});
