import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditStatus, Prisma, UserRole } from '@prisma/client';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { PermissionResolverService } from '../../common/authorization';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { CreateMembershipDto, ListMembershipsQueryDto, UpdateMembershipRoleDto } from './dto/memberships.dto';

const ROLE_RANK: Record<UserRole, number> = {
  VIEWER: 10,
  OPERATOR: 20,
  ADMIN: 30,
  OWNER: 40,
};

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly permissions: PermissionResolverService,
    private readonly billing: BillingService,
  ) {}

  async list(tenantId: string, query: ListMembershipsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 25, 100);
    const where: Prisma.UserMembershipWhereInput = {
      tenantId,
      ...(query.role ? { role: query.role } : {}),
      ...(query.search ? {
        user: {
          OR: [
            { email: { contains: query.search, mode: 'insensitive' } },
            { name: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      } : {}),
    };

    const [total, memberships] = await Promise.all([
      this.prisma.userMembership.count({ where }),
      this.prisma.userMembership.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: memberships.map((membership) => ({
        id: membership.id,
        tenantId: membership.tenantId,
        userId: membership.userId,
        email: membership.user.email,
        name: membership.user.name,
        role: membership.role,
        createdAt: membership.createdAt.toISOString(),
        updatedAt: membership.updatedAt.toISOString(),
      })),
    };
  }

  async create(tenantId: string, actor: AuthenticatedUser, dto: CreateMembershipDto) {
    await this.assertActorCanAssign(tenantId, actor.sub, dto.role);
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, platformRole: true },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    if (user.platformRole) {
      throw new ConflictException('Platform users cannot be assigned to tenant memberships.');
    }

    const existing = await this.prisma.userMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId: user.id } },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this tenant.');
    }

    await this.assertUserQuotaAvailable(tenantId);

    const membership = await this.prisma.userMembership.create({
      data: { tenantId, userId: user.id, role: dto.role },
      include: { user: { select: { email: true, name: true } } },
    });

    await this.audit.record({
      tenantId,
      actorUserId: actor.sub,
      action: AuditAction.USER_INVITED,
      status: AuditStatus.SUCCESS,
      resourceType: 'UserMembership',
      resourceId: membership.id,
      metadata: { userId: user.id, role: dto.role },
    });
    await this.permissions.invalidate(user.id, tenantId);

    return this.toMembershipDto(membership);
  }

  async updateRole(tenantId: string, membershipId: string, actor: AuthenticatedUser, dto: UpdateMembershipRoleDto) {
    const membership = await this.findTenantMembership(tenantId, membershipId);
    await this.assertActorCanManageExisting(tenantId, actor.sub, membership.role, dto.role, membership.userId);

    const updated = await this.prisma.userMembership.update({
      where: { id: membershipId },
      data: { role: dto.role },
      include: { user: { select: { email: true, name: true } } },
    });

    await this.audit.record({
      tenantId,
      actorUserId: actor.sub,
      action: AuditAction.USER_ROLE_CHANGED,
      status: AuditStatus.SUCCESS,
      resourceType: 'UserMembership',
      resourceId: membershipId,
      metadata: {
        userId: membership.userId,
        previousRole: membership.role,
        nextRole: dto.role,
      },
    });
    await this.permissions.invalidate(membership.userId, tenantId);

    return this.toMembershipDto(updated);
  }

  async remove(tenantId: string, membershipId: string, actor: AuthenticatedUser) {
    const membership = await this.findTenantMembership(tenantId, membershipId);
    await this.assertActorCanManageExisting(tenantId, actor.sub, membership.role, undefined, membership.userId);
    await this.assertNotLastOwner(tenantId, membership);

    await this.prisma.userMembership.delete({ where: { id: membershipId } });
    await this.audit.record({
      tenantId,
      actorUserId: actor.sub,
      action: AuditAction.USER_REMOVED,
      status: AuditStatus.SUCCESS,
      resourceType: 'UserMembership',
      resourceId: membershipId,
      metadata: { userId: membership.userId, previousRole: membership.role },
    });
    await this.permissions.invalidate(membership.userId, tenantId);

    return { deleted: true, membershipId };
  }

  private async assertActorCanAssign(tenantId: string, actorUserId: string, nextRole: UserRole) {
    const actor = await this.actorMembership(tenantId, actorUserId);
    if (ROLE_RANK[nextRole] >= ROLE_RANK[actor.role] && actor.role !== UserRole.OWNER) {
      await this.recordDenied(tenantId, actorUserId, 'role_escalation', { nextRole, actorRole: actor.role });
      throw new ForbiddenException('Cannot assign a role equal to or higher than your tenant role.');
    }
  }

  private async assertActorCanManageExisting(
    tenantId: string,
    actorUserId: string,
    currentRole: UserRole,
    nextRole: UserRole | undefined,
    targetUserId: string,
  ) {
    const actor = await this.actorMembership(tenantId, actorUserId);
    if (targetUserId === actorUserId && currentRole === UserRole.OWNER) {
      throw new ForbiddenException('Owners cannot modify their own owner membership.');
    }
    if (actor.role !== UserRole.OWNER && ROLE_RANK[currentRole] >= ROLE_RANK[actor.role]) {
      await this.recordDenied(tenantId, actorUserId, 'role_escalation', { currentRole, actorRole: actor.role });
      throw new ForbiddenException('Cannot manage a membership equal to or higher than your tenant role.');
    }
    if (nextRole) {
      await this.assertActorCanAssign(tenantId, actorUserId, nextRole);
    }
  }

  private async assertNotLastOwner(
    tenantId: string,
    membership: { role: UserRole },
  ) {
    if (membership.role !== UserRole.OWNER) {
      return;
    }
    const owners = await this.prisma.userMembership.count({ where: { tenantId, role: UserRole.OWNER } });
    if (owners <= 1) {
      throw new ConflictException('Cannot remove the last tenant owner.');
    }
  }

  private async assertUserQuotaAvailable(tenantId: string) {
    const [limits, currentUsers] = await Promise.all([
      this.billing.getTenantPlanLimits(tenantId),
      this.prisma.userMembership.count({ where: { tenantId } }),
    ]);

    if (currentUsers >= limits.maxUsersPerTenant) {
      throw new ForbiddenException(
        `User limit reached for this workspace. Plan ${limits.planKey} allows ${limits.maxUsersPerTenant} user(s).`,
      );
    }
  }

  private async actorMembership(tenantId: string, userId: string) {
    const membership = await this.prisma.userMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { id: true, role: true },
    });
    if (!membership) {
      await this.recordDenied(tenantId, userId, 'missing_actor_membership', {});
      throw new ForbiddenException('Actor is not a member of this tenant.');
    }
    return membership;
  }

  private async findTenantMembership(tenantId: string, membershipId: string) {
    const membership = await this.prisma.userMembership.findFirst({
      where: { id: membershipId, tenantId },
      select: { id: true, tenantId: true, userId: true, role: true },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found.');
    }
    return membership;
  }

  private recordDenied(tenantId: string, actorUserId: string, reason: string, metadata: Record<string, unknown>) {
    return this.audit.record({
      tenantId,
      actorUserId,
      action: AuditAction.AUTH_FORBIDDEN,
      status: AuditStatus.FAILURE,
      resourceType: 'UserMembership',
      metadata: { reason, ...metadata },
    });
  }

  private toMembershipDto(membership: {
    id: string;
    tenantId: string;
    userId: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
    user: { email: string; name: string };
  }) {
    return {
      id: membership.id,
      tenantId: membership.tenantId,
      userId: membership.userId,
      email: membership.user.email,
      name: membership.user.name,
      role: membership.role,
      createdAt: membership.createdAt.toISOString(),
      updatedAt: membership.updatedAt.toISOString(),
    };
  }
}
