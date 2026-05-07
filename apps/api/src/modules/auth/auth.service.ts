import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditStatus, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService, AuditAction } from '../../common/audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginLockoutService } from './login-lockout.service';

/**
 * What the service hands back to the controller after a successful
 * authentication. The controller is responsible for converting this
 * into an HttpOnly cookie + a body that exposes only the user shape.
 */
export interface IssuedSession {
  token: string;
  user: {
    id: string;
    email: string;
    tenantId: string;
    role: UserRole;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly lockout: LoginLockoutService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto, ip?: string): Promise<IssuedSession> {
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

    await this.audit.record({
      tenantId:    result.tenant.id,
      actorUserId: result.user.id,
      action:      AuditAction.AUTH_REGISTERED,
      status:      AuditStatus.SUCCESS,
      ipAddress:   ip,
      metadata:    { tenantSlug: slug },
    });

    return this.issueSession(result.user.id, result.user.email, result.tenant.id, UserRole.OWNER);
  }

  async login(dto: LoginDto, ip: string): Promise<IssuedSession> {
    const email = dto.email.toLowerCase().trim();

    // Gate 1 — distributed lockout (Redis). Reject before doing any
    // cryptographic work to keep the server's CPU profile flat.
    try {
      await this.lockout.assertNotLocked(email, ip);
    } catch (err) {
      // Locked tuples generate a single auth.login.locked audit event.
      await this.audit.record({
        action:    AuditAction.AUTH_LOGIN_LOCKED,
        status:    AuditStatus.FAILURE,
        ipAddress: ip,
        metadata:  { email },
      });
      throw err;
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: { orderBy: { createdAt: 'asc' }, take: 1 } }
    });

    const ok = !!user && (await argon2.verify(user.passwordHash, dto.password));

    if (!ok) {
      const {attempts, locked} = await this.lockout.recordFailure(email, ip);
      await this.audit.record({
        actorUserId: user?.id,
        action:      AuditAction.AUTH_LOGIN_FAILED,
        status:      AuditStatus.FAILURE,
        ipAddress:   ip,
        metadata:    { email, attempts, lockedNow: locked },
      });
      // Generic message — never leak which side (email vs password) failed.
      throw new UnauthorizedException('Invalid credentials.');
    }

    const membership = user.memberships[0];
    if (!membership) {
      await this.audit.record({
        actorUserId: user.id,
        action:      AuditAction.AUTH_LOGIN_FAILED,
        status:      AuditStatus.FAILURE,
        ipAddress:   ip,
        metadata:    { email, reason: 'no_tenant_membership' },
      });
      throw new UnauthorizedException('User is not assigned to a tenant.');
    }

    await this.lockout.recordSuccess(email, ip);

    await this.audit.record({
      tenantId:    membership.tenantId,
      actorUserId: user.id,
      action:      AuditAction.AUTH_LOGIN_SUCCEEDED,
      status:      AuditStatus.SUCCESS,
      ipAddress:   ip,
      metadata:    { role: membership.role },
    });

    return this.issueSession(user.id, user.email, membership.tenantId, membership.role);
  }

  /**
   * Audit-log a logout. The controller is responsible for actually
   * clearing the cookie — this method only records the event and is
   * tolerant of an unauthenticated logout (idempotent client behaviour).
   */
  async recordLogout(actor: {sub: string; tenantId: string} | null, ip?: string): Promise<void> {
    if (!actor) return;
    await this.audit.record({
      tenantId:    actor.tenantId,
      actorUserId: actor.sub,
      action:      AuditAction.AUTH_LOGOUT,
      status:      AuditStatus.SUCCESS,
      ipAddress:   ip,
    });
  }

  private issueSession(
    userId: string,
    email: string,
    tenantId: string,
    role: UserRole,
  ): IssuedSession {
    const token = this.jwtService.sign({
      sub: userId,
      email,
      tenantId,
      role,
    });

    return {
      token,
      user: {
        id: userId,
        email,
        tenantId,
        role,
      },
    };
  }
}
