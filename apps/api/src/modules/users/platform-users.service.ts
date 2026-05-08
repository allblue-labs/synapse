import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditStatus, PlatformRole, Prisma, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import {
  CreateCustomerUserDto,
  CreatePlatformAdminDto,
  CreatePlatformTesterDto,
  PlatformScopesDto,
  UpdatePlatformAccessDto,
} from './dto/platform-users.dto';

type PlatformScopeSelection = {
  metrics: string[];
  modules: string[];
  policies: string[];
};

@Injectable()
export class PlatformUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { platformRole: { not: null } },
          { memberships: { some: {} } },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        platformRole: true,
        platformScopes: true,
        createdAt: true,
        memberships: {
          select: {
            tenantId: true,
            role: true,
            tenant: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      platformRole: user.platformRole,
      platformScopes: user.platformScopes,
      memberships: user.memberships,
      createdAt: user.createdAt.toISOString(),
    }));
  }

  createPlatformAdmin(actor: AuthenticatedUser, dto: CreatePlatformAdminDto) {
    return this.createPlatformUser(actor, {
      email: dto.email,
      name: dto.name,
      password: dto.password,
      platformRole: PlatformRole.ADMIN,
      scopes: dto.scopes,
    });
  }

  createPlatformTester(actor: AuthenticatedUser, dto: CreatePlatformTesterDto) {
    return this.createPlatformUser(actor, {
      email: dto.email,
      name: dto.name,
      password: dto.password,
      platformRole: PlatformRole.TESTER,
      scopes: dto.scopes,
    });
  }

  async createCustomerUser(actor: AuthenticatedUser, dto: CreateCustomerUserDto) {
    const email = dto.email.toLowerCase().trim();
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, platformRole: true },
    });

    if (existing?.platformRole) {
      throw new ConflictException('Platform users cannot be attached as customer users.');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = existing
      ? await this.attachExistingCustomerUser(existing.id, tenant.id, dto.role)
      : await this.prisma.user.create({
          data: {
            email,
            name: dto.name.trim(),
            passwordHash,
            memberships: {
              create: { tenantId: tenant.id, role: dto.role },
            },
          },
          select: { id: true, email: true, name: true },
        });

    await this.audit.record({
      tenantId: tenant.id,
      actorUserId: actor.sub,
      action: AuditAction.PLATFORM_USER_CREATED,
      status: AuditStatus.SUCCESS,
      resourceType: 'User',
      resourceId: user.id,
      metadata: {
        targetRole: dto.role,
        targetKind: 'customer',
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: tenant.id,
      role: dto.role,
    };
  }

  async updatePlatformAccess(
    actor: AuthenticatedUser,
    userId: string,
    dto: UpdatePlatformAccessDto,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, platformRole: true },
    });
    if (!existing?.platformRole) {
      throw new NotFoundException('Platform user not found.');
    }

    const nextRole = dto.platformRole ?? existing.platformRole;
    if (
      nextRole === PlatformRole.SUPER_ADMIN ||
      nextRole === PlatformRole.PLATFORM_ADMIN
    ) {
      throw new ConflictException('Super admin access can only be granted through controlled bootstrap.');
    }

    const updateData: Prisma.UserUpdateInput = {
      platformRole: nextRole,
    };
    if (dto.scopes) {
      updateData.platformScopes = this.sanitizeScopes(dto.scopes) as Prisma.InputJsonValue;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        platformRole: true,
        platformScopes: true,
      },
    });

    await this.audit.record({
      actorUserId: actor.sub,
      action: AuditAction.PLATFORM_USER_UPDATED,
      status: AuditStatus.SUCCESS,
      resourceType: 'User',
      resourceId: user.id,
      metadata: {
        previousRole: existing.platformRole,
        nextRole,
        scopesUpdated: !!dto.scopes,
      },
    });

    return user;
  }

  private async createPlatformUser(
    actor: AuthenticatedUser,
    input: {
      email: string;
      name: string;
      password: string;
      platformRole: PlatformRole;
      scopes?: PlatformScopesDto;
    },
  ) {
    const email = input.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const scopes = this.sanitizeScopes(input.scopes);
    const passwordHash = await argon2.hash(input.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name.trim(),
        passwordHash,
        platformRole: input.platformRole,
        platformScopes: scopes as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        email: true,
        name: true,
        platformRole: true,
        platformScopes: true,
      },
    });

    await this.audit.record({
      actorUserId: actor.sub,
      action: AuditAction.PLATFORM_USER_CREATED,
      status: AuditStatus.SUCCESS,
      resourceType: 'User',
      resourceId: user.id,
      metadata: {
        targetRole: input.platformRole,
        scopeCounts: {
          metrics: scopes.metrics.length,
          modules: scopes.modules.length,
          policies: scopes.policies.length,
        },
      },
    });

    return user;
  }

  private async attachExistingCustomerUser(userId: string, tenantId: string, role: UserRole) {
    const membership = await this.prisma.userMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { id: true },
    });
    if (membership) {
      throw new ConflictException('User is already assigned to this tenant.');
    }

    await this.prisma.userMembership.create({
      data: { tenantId, userId, role },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    return user;
  }

  private sanitizeScopes(scopes?: PlatformScopesDto): PlatformScopeSelection {
    return {
      metrics: this.uniqueStrings(scopes?.metrics),
      modules: this.uniqueStrings(scopes?.modules),
      policies: this.uniqueStrings(scopes?.policies),
    };
  }

  private uniqueStrings(values?: string[]): string[] {
    return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))].sort();
  }
}
