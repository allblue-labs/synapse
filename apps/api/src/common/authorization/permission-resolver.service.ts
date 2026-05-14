import { Inject, Injectable, Optional } from '@nestjs/common';
import { PlatformRole, UserRole } from '@prisma/client';
import { permissionsForRole, type AuthRole, type Permission } from '@synapse/contracts';
import type { Redis } from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { AuthenticatedUser } from '../types/authenticated-user';

const TENANT_PERMISSION_CACHE_TTL_SECONDS = 60;

@Injectable()
export class PermissionResolverService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redis?: Redis,
  ) {}

  async resolve(user: AuthenticatedUser, tenantId?: string): Promise<{
    role?: AuthRole;
    permissions: ReadonlyArray<Permission>;
    source: 'platform' | 'membership' | 'tenantless';
  }> {
    if (this.isPlatformRole(user.role)) {
      return {
        role: user.role,
        permissions: permissionsForRole(user.role),
        source: 'platform',
      };
    }

    if (!tenantId) {
      return {
        role: user.role,
        permissions: [],
        source: 'tenantless',
      };
    }

    const cached = await this.readTenantCache(user.sub, tenantId);
    if (cached) {
      return cached;
    }

    const membership = await this.prisma.userMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: user.sub,
        },
      },
      select: { role: true },
    });

    if (!membership) {
      return {
        role: user.role,
        permissions: [],
        source: 'membership',
      };
    }

    const role = membership.role as AuthRole;
    const resolved = {
      role,
      permissions: permissionsForRole(role),
      source: 'membership' as const,
    };
    await this.writeTenantCache(user.sub, tenantId, resolved);
    return resolved;
  }

  async invalidate(userId: string, tenantId: string) {
    if (!this.redis) return;
    try {
      await this.redis.del(this.cacheKey(userId, tenantId));
    } catch {
      // Permission cache is an accelerator only. Database remains source of truth.
    }
  }

  private async readTenantCache(userId: string, tenantId: string) {
    if (!this.redis) return null;
    try {
      const value = await this.redis.get(this.cacheKey(userId, tenantId));
      if (!value) return null;
      const parsed = JSON.parse(value) as { role?: AuthRole; permissions?: Permission[] };
      if (!parsed.role || !Array.isArray(parsed.permissions)) return null;
      return {
        role: parsed.role,
        permissions: parsed.permissions,
        source: 'membership' as const,
      };
    } catch {
      return null;
    }
  }

  private async writeTenantCache(
    userId: string,
    tenantId: string,
    resolved: { role: AuthRole; permissions: ReadonlyArray<Permission>; source: 'membership' },
  ) {
    if (!this.redis) return;
    try {
      await this.redis.set(
        this.cacheKey(userId, tenantId),
        JSON.stringify({ role: resolved.role, permissions: resolved.permissions }),
        'EX',
        TENANT_PERMISSION_CACHE_TTL_SECONDS,
      );
    } catch {
      // Cache write failure must not block authorization from using database truth.
    }
  }

  private cacheKey(userId: string, tenantId: string) {
    return `authz:membership-permissions:${tenantId}:${userId}`;
  }

  private isPlatformRole(role: AuthRole) {
    return [
      PlatformRole.SUPER_ADMIN,
      PlatformRole.PLATFORM_ADMIN,
      PlatformRole.ADMIN,
      PlatformRole.TESTER,
      'super_admin',
      'platform_admin',
      'admin',
      'tester',
    ].includes(role as PlatformRole | AuthRole);
  }
}
