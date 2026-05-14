import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../types/authenticated-user';
import { IS_PUBLIC_KEY } from '../authorization/public.decorator';
import { ALLOW_TENANTLESS_KEY } from '../authorization/tenantless.decorator';

/**
 * Verifies authenticated tenant context. Tenant users are locked to their JWT
 * tenant. Platform admins are tenantless by default and may pass x-tenant-id
 * when intentionally operating inside a tenant boundary.
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

    const allowTenantless = this.reflector.getAllAndOverride<boolean>(ALLOW_TENANTLESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      tenantId?: string;
      headers: Record<string, string | undefined>;
    }>();

    if (!request.user) {
      throw new UnauthorizedException('Tenant context is required.');
    }

    const requestedTenantId = request.headers['x-tenant-id'];
    if (['super_admin', 'platform_admin', 'admin', 'tester'].includes(request.user.role)) {
      if (requestedTenantId) {
        request.tenantId = requestedTenantId;
        return true;
      }
      if (allowTenantless) return true;
      throw new UnauthorizedException('Tenant context is required.');
    }

    if (!request.user.tenantId) {
      const path = context.switchToHttp().getRequest<{ originalUrl?: string; url?: string }>().originalUrl ??
        context.switchToHttp().getRequest<{ originalUrl?: string; url?: string }>().url ??
        '';
      if (path.includes('/modules')) {
        throw new UnauthorizedException('You must create at least one workspace before activating modules.');
      }
      throw new UnauthorizedException('Tenant context is required.');
    }

    if (requestedTenantId && requestedTenantId !== request.user.tenantId) {
      throw new UnauthorizedException('Authenticated user cannot access this tenant.');
    }

    request.tenantId = request.user.tenantId;
    return true;
  }
}
