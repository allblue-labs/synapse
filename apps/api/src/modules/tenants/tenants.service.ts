import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditStatus, UserRole } from '@prisma/client';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BillingService } from '../billing/billing.service';

export type CreateTenantInput = {
  actorUserId: string;
  name: string;
  slug: string;
};

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly audit: AuditService,
  ) {}

  async getById(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        billingAccount: true
      }
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    return tenant;
  }

  async create(input: CreateTenantInput) {
    const slug = input.slug.toLowerCase().trim();
    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('A tenant with this slug already exists.');
    }

    await this.billing.assertCanCreateTenantForUser(input.actorUserId);

    const tenant = await this.prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          name: input.name.trim(),
          slug,
          status: 'ACTIVE',
          billingAccount: {
            create: {
              planKey: 'trial',
              status: 'TRIALING',
            },
          },
          users: {
            create: {
              userId: input.actorUserId,
              role: UserRole.OWNER,
            },
          },
        },
        include: {
          billingAccount: true,
          users: true,
        },
      });

      return created;
    });

    await this.audit.record({
      tenantId: tenant.id,
      actorUserId: input.actorUserId,
      action: AuditAction.TENANT_CREATED,
      status: AuditStatus.SUCCESS,
      resourceType: 'Tenant',
      resourceId: tenant.id,
      metadata: { slug },
    });

    return tenant;
  }
}
