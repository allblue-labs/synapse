import { ConflictException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { TenantsService } from './tenants.service';

describe('TenantsService', () => {
  const prisma = {
    tenant: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const billing = {
    assertCanCreateTenantForUser: jest.fn(),
  };
  const audit = {
    record: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates a tenant/workspace only after platform plan governance allows it', async () => {
    const service = new TenantsService(
      prisma as unknown as PrismaService,
      billing as unknown as BillingService,
      audit as unknown as AuditService,
    );
    prisma.tenant.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (callback) => callback({
      tenant: {
        create: jest.fn().mockResolvedValue({
          id: 'tenant-1',
          name: 'Tenant One',
          slug: 'tenant-one',
          billingAccount: { planKey: 'trial' },
          users: [{ userId: 'user-1', role: UserRole.OWNER }],
        }),
      },
    }));

    await expect(service.create({
      actorUserId: 'user-1',
      name: 'Tenant One',
      slug: 'tenant-one',
    })).resolves.toEqual(expect.objectContaining({ id: 'tenant-1' }));

    expect(billing.assertCanCreateTenantForUser).toHaveBeenCalledWith('user-1');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('rejects tenant creation when the slug already exists', async () => {
    const service = new TenantsService(
      prisma as unknown as PrismaService,
      billing as unknown as BillingService,
      audit as unknown as AuditService,
    );
    prisma.tenant.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(service.create({
      actorUserId: 'user-1',
      name: 'Tenant One',
      slug: 'tenant-one',
    })).rejects.toBeInstanceOf(ConflictException);

    expect(billing.assertCanCreateTenantForUser).not.toHaveBeenCalled();
  });

  it('surfaces a clear business error from plan tenant limits', async () => {
    const service = new TenantsService(
      prisma as unknown as PrismaService,
      billing as unknown as BillingService,
      audit as unknown as AuditService,
    );
    prisma.tenant.findUnique.mockResolvedValue(null);
    billing.assertCanCreateTenantForUser.mockRejectedValue(
      new ForbiddenException('Workspace limit reached for your current plan. Plan light allows 1 workspace(s).'),
    );

    await expect(service.create({
      actorUserId: 'user-1',
      name: 'Second Tenant',
      slug: 'second-tenant',
    })).rejects.toThrow('Workspace limit reached');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
