import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../types/authenticated-user';
import { IS_PUBLIC_KEY } from '../authorization/public.decorator';

/**
 * Verifies that an authenticated request carries a tenant context. Public
 * routes (those marked `@Public()`) are skipped because they may run before
 * a tenant is established (login, register, health probes).
 *
 * Optionally cross-checks the `x-tenant-id` header so a token issued for
 * tenant A cannot be used to address tenant B's resources.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      tenantId?: string;
      headers: Record<string, string | undefined>;
    }>();

    if (!request.user?.tenantId) {
      throw new UnauthorizedException('Tenant context is required.');
    }

    const requestedTenantId = request.headers['x-tenant-id'];
    if (requestedTenantId && requestedTenantId !== request.user.tenantId) {
      throw new UnauthorizedException('Authenticated user cannot access this tenant.');
    }

    request.tenantId = request.user.tenantId;
    return true;
  }
}
