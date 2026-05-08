import { ForbiddenException } from '@nestjs/common';
import { PlatformScopeService } from './platform-scope.service';

describe('PlatformScopeService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    prisma.user.findUnique.mockReset();
  });

  it('grants wildcard scopes to super admins', async () => {
    const service = new PlatformScopeService(prisma as never);

    await expect(service.scopesFor({
      sub: 'super_1',
      email: 'super@example.com',
      role: 'super_admin',
    })).resolves.toEqual({
      metrics: ['*'],
      modules: ['*'],
      policies: ['*'],
    });
  });

  it('loads stored scopes for granular admins', async () => {
    prisma.user.findUnique.mockResolvedValue({
      platformScopes: {
        metrics: ['usage'],
        modules: ['pulse'],
        policies: ['billing.plan.pro.commercial'],
      },
    });
    const service = new PlatformScopeService(prisma as never);

    await expect(service.scopesFor({
      sub: 'admin_1',
      email: 'admin@example.com',
      role: 'admin',
    })).resolves.toEqual({
      metrics: ['usage'],
      modules: ['pulse'],
      policies: ['billing.plan.pro.commercial'],
    });
  });

  it('rejects requested scope values that are not assigned', () => {
    const service = new PlatformScopeService(prisma as never);

    expect(() =>
      service.assertAllowed({ metrics: [], modules: ['pulse'], policies: [] }, 'modules', 'billing'),
    ).toThrow(ForbiddenException);
  });
});
