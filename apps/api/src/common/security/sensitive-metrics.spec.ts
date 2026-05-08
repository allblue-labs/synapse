import { maskSensitiveMetricFields } from './sensitive-metrics';

describe('sensitive metric masking', () => {
  it('masks sensitive metric fields for granular admins', () => {
    const result = maskSensitiveMetricFields(
      {
        tenantId: 'tenant_1',
        customerEmail: 'customer@example.com',
        nested: {
          revenueRaw: '1000',
          visible: 'ok',
        },
      },
      {
        sub: 'admin_1',
        email: 'admin@example.com',
        role: 'admin',
      },
    );

    expect(result).toEqual({
      tenantId: 'tenant_1',
      customerEmail: '[redacted]',
      nested: {
        revenueRaw: '[redacted]',
        visible: 'ok',
      },
    });
  });

  it('allows super admins to receive full metric payloads', () => {
    const payload = { customerEmail: 'customer@example.com', revenueRaw: '1000' };

    expect(maskSensitiveMetricFields(payload, {
      sub: 'super_1',
      email: 'super@example.com',
      role: 'super_admin',
    })).toBe(payload);
  });
});
