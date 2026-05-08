import { Injectable, NotFoundException } from '@nestjs/common';
import { permissionsForRole, type CurrentUser, type UserRole } from '@synapse/contracts';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the canonical CurrentUser projection used by the frontend. The
   * user's role drives a frozen permission set resolved from the shared
   * `@synapse/contracts` map — the API is the only authority on permissions
   * so the UI cannot drift.
   */
  async getMe(tenantId: string | undefined, userId: string): Promise<CurrentUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, platformRole: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const platformRole = this.toAuthRole(user.platformRole);
    if (platformRole && !tenantId) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: platformRole,
        permissions: permissionsForRole(platformRole),
      };
    }

    if (!tenantId) {
      throw new NotFoundException('User membership not found.');
    }

    const membership = await this.prisma.userMembership.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User membership not found.');
    }

    const role = membership.role as UserRole;

    return {
      id:    membership.user.id,
      email: membership.user.email,
      name:  membership.user.name,
      role,
      permissions: permissionsForRole(role),
      tenant: {
        id:   membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
      },
    };
  }

  private toAuthRole(role: string | null): 'super_admin' | 'admin' | 'tester' | null {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'PLATFORM_ADMIN':
        return 'super_admin';
      case 'ADMIN':
        return 'admin';
      case 'TESTER':
        return 'tester';
      default:
        return null;
    }
  }
}
