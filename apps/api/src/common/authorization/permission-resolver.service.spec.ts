import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionResolverService } from './permission-resolver.service';

describe('PermissionResolverService', () => {
  const prisma = {
    userMembership: {
      findUnique: jest.fn(),
    },
  };
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns platform permissions without tenant membership lookup', async () => {
    const service = new PermissionResolverService(
      prisma as unknown as PrismaService,
      redis as never,
    );

    await expect(service.resolve({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
    })).resolves.toEqual(expect.objectContaining({
      source: 'platform',
      permissions: expect.arrayContaining(['platform:users:manage_customers']),
    }));
    expect(prisma.userMembership.findUnique).not.toHaveBeenCalled();
  });

  it('resolves tenant permissions from membership and writes cache', async () => {
    prisma.userMembership.findUnique.mockResolvedValue({ role: UserRole.ADMIN });
    const service = new PermissionResolverService(
      prisma as unknown as PrismaService,
      redis as never,
    );

    await expect(service.resolve({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'VIEWER',
      tenantId: 'tenant-1',
    }, 'tenant-1')).resolves.toEqual(expect.objectContaining({
      source: 'membership',
      role: UserRole.ADMIN,
      permissions: expect.arrayContaining(['users:invite']),
    }));

    expect(redis.set).toHaveBeenCalledWith(
      'authz:membership-permissions:tenant-1:user-1',
      expect.stringContaining('ADMIN'),
      'EX',
      60,
    );
  });

  it('uses cached membership permissions when available', async () => {
    redis.get.mockResolvedValue(JSON.stringify({
      role: UserRole.OPERATOR,
      permissions: ['pulse:write'],
    }));
    const service = new PermissionResolverService(
      prisma as unknown as PrismaService,
      redis as never,
    );

    await expect(service.resolve({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'VIEWER',
      tenantId: 'tenant-1',
    }, 'tenant-1')).resolves.toEqual({
      source: 'membership',
      role: UserRole.OPERATOR,
      permissions: ['pulse:write'],
    });
    expect(prisma.userMembership.findUnique).not.toHaveBeenCalled();
  });

  it('invalidates the tenant membership permission cache', async () => {
    const service = new PermissionResolverService(
      prisma as unknown as PrismaService,
      redis as never,
    );

    await service.invalidate('user-1', 'tenant-1');

    expect(redis.del).toHaveBeenCalledWith('authz:membership-permissions:tenant-1:user-1');
  });
});
