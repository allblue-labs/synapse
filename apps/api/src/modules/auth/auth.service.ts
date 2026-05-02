import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const slug = dto.tenantSlug.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const existingTenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      throw new ConflictException('A tenant with this slug already exists.');
    }

    const passwordHash = await argon2.hash(dto.password);
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug,
          status: 'ACTIVE',
          billingAccount: {
            create: {
              planKey: 'starter'
            }
          }
        }
      });

      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: dto.name,
          passwordHash,
          memberships: {
            create: {
              tenantId: tenant.id,
              role: UserRole.OWNER
            }
          }
        }
      });

      return { tenant, user };
    });

    return this.issueSession(result.user.id, result.user.email, result.tenant.id, UserRole.OWNER);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { memberships: { orderBy: { createdAt: 'asc' }, take: 1 } }
    });

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException('User is not assigned to a tenant.');
    }

    return this.issueSession(user.id, user.email, membership.tenantId, membership.role);
  }

  private issueSession(userId: string, email: string, tenantId: string, role: UserRole) {
    const accessToken = this.jwtService.sign({
      sub: userId,
      email,
      tenantId,
      role
    });

    return {
      accessToken,
      user: {
        id: userId,
        email,
        tenantId,
        role
      }
    };
  }
}
