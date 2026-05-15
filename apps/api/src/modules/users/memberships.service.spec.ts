import { ConflictException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { MembershipsService } from './memberships.service';

describe('MembershipsService', () => {
  const prisma = {
    userMembership: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };
  const audit = {
    record: jest.fn(),
  };
  const permissions = {
    invalidate: jest.fn(),
  };
  const billing = {
    getTenantPlanLimits: jest.fn(),
  };
  const actor = {
    sub: 'owner-1',
    email: 'owner@example.com',
    tenantId: 'tenant-1',
    role: 'tenant_owner' as const,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    billing.getTenantPlanLimits.mockResolvedValue({
      planKey: 'light',
      maxUsersPerTenant: 3,
    });
  });

  function service() {
    return new MembershipsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      permissions as never,
      billing as unknown as BillingService,
    );
  }

  it('lists tenant-scoped memberships with pagination', async () => {
    prisma.userMembership.count.mockResolvedValue(1);
    prisma.userMembership.findMany.mockResolvedValue([
      {
        id: 'membership-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: UserRole.OPERATOR,
        createdAt: new Date('2026-05-14T10:00:00.000Z'),
        updatedAt: new Date('2026-05-14T10:00:00.000Z'),
        user: { email: 'operator@example.com', name: 'Operator' },
      },
    ]);

    await expect(service().list('tenant-1', { page: 1, pageSize: 10 }))
      .resolves.toEqual(expect.objectContaining({
        total: 1,
        items: [expect.objectContaining({ tenantId: 'tenant-1', role: UserRole.OPERATOR })],
      }));
    expect(prisma.userMembership.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: 'tenant-1' },
      take: 10,
    }));
  });

  it('creates a membership when the actor can assign the role', async () => {
    prisma.userMembership.findUnique
      .mockResolvedValueOnce({ id: 'actor-membership', role: UserRole.OWNER })
      .mockResolvedValueOnce(null);
    prisma.user.findUnique.mockResolvedValue({
      id: 'operator-1',
      email: 'operator@example.com',
      name: 'Operator',
      platformRole: null,
    });
    prisma.userMembership.count.mockResolvedValue(1);
    prisma.userMembership.create.mockResolvedValue({
      id: 'membership-1',
      tenantId: 'tenant-1',
      userId: 'operator-1',
      role: UserRole.OPERATOR,
      createdAt: new Date('2026-05-14T10:00:00.000Z'),
      updatedAt: new Date('2026-05-14T10:00:00.000Z'),
      user: { email: 'operator@example.com', name: 'Operator' },
    });

    await expect(service().create('tenant-1', actor, {
      email: 'operator@example.com',
      role: UserRole.OPERATOR,
    })).resolves.toEqual(expect.objectContaining({ role: UserRole.OPERATOR }));
    expect(billing.getTenantPlanLimits).toHaveBeenCalledWith('tenant-1');
    expect(permissions.invalidate).toHaveBeenCalledWith('operator-1', 'tenant-1');
  });

  it('rejects membership creation when the workspace reached plan user quota', async () => {
    prisma.userMembership.findUnique
      .mockResolvedValueOnce({ id: 'actor-membership', role: UserRole.OWNER })
      .mockResolvedValueOnce(null);
    prisma.user.findUnique.mockResolvedValue({
      id: 'operator-1',
      email: 'operator@example.com',
      name: 'Operator',
      platformRole: null,
    });
    billing.getTenantPlanLimits.mockResolvedValue({
      planKey: 'light',
      maxUsersPerTenant: 1,
    });
    prisma.userMembership.count.mockResolvedValue(1);

    await expect(service().create('tenant-1', actor, {
      email: 'operator@example.com',
      role: UserRole.OPERATOR,
    })).rejects.toThrow('User limit reached');

    expect(prisma.userMembership.create).not.toHaveBeenCalled();
    expect(permissions.invalidate).not.toHaveBeenCalled();
  });

  it('prevents tenant admins from assigning owner memberships', async () => {
    prisma.userMembership.findUnique.mockResolvedValue({ id: 'actor-membership', role: UserRole.ADMIN });

    await expect(service().create('tenant-1', {
      ...actor,
      sub: 'admin-1',
      role: 'tenant_admin',
    }, {
      email: 'target@example.com',
      role: UserRole.OWNER,
    })).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.userMembership.create).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'auth.forbidden',
      status: 'FAILURE',
    }));
  });

  it('prevents removal of the last tenant owner', async () => {
    prisma.userMembership.findFirst.mockResolvedValue({
      id: 'membership-owner',
      tenantId: 'tenant-1',
      userId: 'other-owner',
      role: UserRole.OWNER,
    });
    prisma.userMembership.findUnique.mockResolvedValue({ id: 'actor-membership', role: UserRole.OWNER });
    prisma.userMembership.count.mockResolvedValue(1);

    await expect(service().remove('tenant-1', 'membership-owner', actor))
      .rejects.toBeInstanceOf(ConflictException);

    expect(prisma.userMembership.delete).not.toHaveBeenCalled();
  });
});
