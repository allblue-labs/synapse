import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  databaseFixtureIds,
  describeDatabase,
  resetTenantFixtures,
  seedTwoTenants,
} from '../../testing/database-fixtures';
import { AuthenticatedUser } from '../types/authenticated-user';
import { PermissionResolverService } from './permission-resolver.service';
import { PermissionsGuard } from './permissions.guard';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PERMISSIONS_KEY } from './permissions.decorator';

describeDatabase('Permission resolver database fixtures', () => {
  const ids = databaseFixtureIds('permission-resolver');
  const tenantIds = [ids.tenantA, ids.tenantB];
  const userId = `${ids.slugA}-member`;
  const outsiderId = `${ids.slugA}-outsider`;

  let prisma: PrismaService;
  let resolver: PermissionResolverService;
  let guard: PermissionsGuard;
  let connected = false;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    connected = true;
    await resetFixtures();
    await seedTwoTenants(prisma, ids);
    await seedUsersAndMemberships();

    resolver = new PermissionResolverService(prisma);
    guard = new PermissionsGuard(
      reflectorFor(['tickets:write']),
      new AuditService(prisma, { write: jest.fn() } as never),
      resolver,
    );
  });

  beforeEach(async () => {
    await prisma.auditEvent.deleteMany({ where: { tenantId: { in: tenantIds } } });
  });

  afterAll(async () => {
    if (connected) {
      await resetFixtures();
      await prisma.$disconnect();
    }
  });

  it('denies stale sessions after membership downgrade without requiring logout', async () => {
    const staleAdminSession: AuthenticatedUser = {
      sub: userId,
      email: 'resolver-member@synapse.local',
      tenantId: ids.tenantA,
      role: 'tenant_admin',
    };

    await prisma.userMembership.update({
      where: { tenantId_userId: { tenantId: ids.tenantA, userId } },
      data: { role: UserRole.VIEWER },
    });

    await expect(
      guard.canActivate(contextFor(staleAdminSession, ids.tenantA)),
    ).rejects.toThrow('Missing required permission');

    await expect(prisma.auditEvent.findFirst({
      where: {
        tenantId: ids.tenantA,
        actorUserId: userId,
        action: 'auth.forbidden',
      },
    })).resolves.toEqual(expect.objectContaining({
      metadata: expect.objectContaining({
        jwtRole: 'tenant_admin',
        resolvedRole: 'VIEWER',
        source: 'membership',
      }),
    }));
  });

  it('uses tenant-specific membership and does not leak permissions across tenants', async () => {
    await prisma.userMembership.update({
      where: { tenantId_userId: { tenantId: ids.tenantA, userId } },
      data: { role: UserRole.ADMIN },
    });
    await prisma.userMembership.update({
      where: { tenantId_userId: { tenantId: ids.tenantB, userId } },
      data: { role: UserRole.VIEWER },
    });

    await expect(resolver.resolve({
      sub: userId,
      email: 'resolver-member@synapse.local',
      tenantId: ids.tenantA,
      role: 'tenant_viewer',
    }, ids.tenantA)).resolves.toEqual(expect.objectContaining({
      role: UserRole.ADMIN,
      permissions: expect.arrayContaining(['tickets:write']),
    }));

    await expect(resolver.resolve({
      sub: userId,
      email: 'resolver-member@synapse.local',
      tenantId: ids.tenantB,
      role: 'tenant_admin',
    }, ids.tenantB)).resolves.toEqual(expect.objectContaining({
      role: UserRole.VIEWER,
      permissions: expect.not.arrayContaining(['tickets:write']),
    }));
  });

  it('returns no tenant permissions when the selected tenant has no membership', async () => {
    await expect(resolver.resolve({
      sub: outsiderId,
      email: 'resolver-outsider@synapse.local',
      tenantId: ids.tenantA,
      role: 'tenant_admin',
    }, ids.tenantA)).resolves.toEqual({
      role: 'tenant_admin',
      permissions: [],
      source: 'membership',
    });
  });

  async function seedUsersAndMemberships() {
    await prisma.user.createMany({
      data: [
        {
          id: userId,
          email: 'resolver-member@synapse.local',
          name: 'Resolver Member',
          passwordHash: 'fixture-hash',
        },
        {
          id: outsiderId,
          email: 'resolver-outsider@synapse.local',
          name: 'Resolver Outsider',
          passwordHash: 'fixture-hash',
        },
      ],
    });

    await prisma.userMembership.createMany({
      data: [
        { tenantId: ids.tenantA, userId, role: UserRole.ADMIN },
        { tenantId: ids.tenantB, userId, role: UserRole.VIEWER },
      ],
    });
  }

  async function resetFixtures() {
    await resetTenantFixtures(prisma, tenantIds);
    await prisma.user.deleteMany({ where: { id: { in: [userId, outsiderId] } } });
  }

  function reflectorFor(required: string[]) {
    return {
      getAllAndOverride: jest.fn((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return required;
        return undefined;
      }),
    } as unknown as Reflector;
  }

  function contextFor(user: AuthenticatedUser, tenantId: string): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(() => ({ user, tenantId })),
      })),
    } as unknown as ExecutionContext;
  }
});
