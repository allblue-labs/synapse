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
  async getMe(tenantId: string, userId: string): Promise<CurrentUser> {
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
}
