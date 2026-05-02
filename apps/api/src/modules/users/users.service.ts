import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(tenantId: string, userId: string) {
    const membership = await this.prisma.userMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true
          }
        },
        tenant: true
      }
    });

    if (!membership) {
      throw new NotFoundException('User membership not found.');
    }

    return membership;
  }
}
