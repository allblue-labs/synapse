import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  function createService(tx: { $executeRaw: jest.Mock }) {
    const service = Object.create(PrismaService.prototype) as PrismaService;
    const transaction = jest.fn(async (callback: (transactionClient: typeof tx) => Promise<unknown>) => callback(tx));

    Object.defineProperty(service, '$transaction', {
      value: transaction
    });

    return { service, transaction };
  }

  it('sets tenant context inside the transaction before running the callback', async () => {
    const tx = { $executeRaw: jest.fn().mockResolvedValue(1) };
    const { service, transaction } = createService(tx);
    const callback = jest.fn().mockResolvedValue('ok');

    const result = await service.withTenantContext('tenant_1', callback);

    expect(result).toBe('ok');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith(tx);
    expect(tx.$executeRaw.mock.calls[0][0][0]).toContain("set_config('app.current_tenant_id'");
    expect(tx.$executeRaw.mock.calls[0][1]).toBe('tenant_1');
    expect(tx.$executeRaw.mock.calls[1][0][0]).toContain("set_config('app.platform_bypass'");
    expect(tx.$executeRaw.mock.calls[1][1]).toBe('false');
  });

  it('sets controlled platform bypass when explicitly requested', async () => {
    const tx = { $executeRaw: jest.fn().mockResolvedValue(1) };
    const { service } = createService(tx);

    await service.withTenantContext('tenant_1', jest.fn().mockResolvedValue('ok'), { platformBypass: true });

    expect(tx.$executeRaw.mock.calls[1][1]).toBe('true');
  });

  it('rejects empty tenant context', async () => {
    const tx = { $executeRaw: jest.fn().mockResolvedValue(1) };
    const { service, transaction } = createService(tx);

    await expect(service.withTenantContext(' ', jest.fn())).rejects.toThrow(
      'tenantId is required for tenant-scoped database transactions'
    );
    expect(transaction).not.toHaveBeenCalled();
  });
});
