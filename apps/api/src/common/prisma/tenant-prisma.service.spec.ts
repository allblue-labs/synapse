import { TenantPrismaService } from './tenant-prisma.service';

describe('TenantPrismaService', () => {
  it('injects tenantId into agent reads', async () => {
    const prisma = {
      agent: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    const service = new TenantPrismaService(prisma as never);

    await service.agents({ tenantId: 'tenant_1' }).findMany({
      where: { status: 'ACTIVE' }
    });

    expect(prisma.agent.findMany).toHaveBeenCalledWith({
      where: {
        status: 'ACTIVE',
        tenantId: 'tenant_1'
      }
    });
  });
});
