import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '@synapse/contracts';
import { AuthenticatedUser } from '../types/authenticated-user';
import { AuditAction, AuditService } from '../audit/audit.service';
import { PermissionResolverService } from './permission-resolver.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PERMISSIONS_KEY } from './permissions.decorator';

/**
 * Global permissions guard. Runs *after* JwtAuthGuard + TenantGuard so it can
 * trust the request's `user` field is populated.
 *
 * Behaviour:
 *   - public route                     → allow
 *   - no @Permissions() declared       → allow (auth-only route)
 *   - all required permissions granted → allow
 *   - any permission missing           → 403 Forbidden
 *
 * Permissions are derived from the authenticated user's role via the canonical
 * `ROLE_PERMISSIONS` map in `@synapse/contracts`. This is the only place
 * roles are translated into permissions on the backend — controllers must
 * not check roles directly.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
    private readonly permissions: PermissionResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Public routes were already let through by JwtAuthGuard — but if a public
    // route also somehow declared @Permissions we still want to skip.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      tenantId?: string;
    }>();
    const user = request.user;

    if (!user?.role) {
      // JwtAuthGuard should have rejected anonymous requests already, but be
      // defensive: never let an unauthenticated request reach a permissioned route.
      throw new ForbiddenException('Authentication required.');
    }

    const resolved = await this.permissions.resolve(user, request.tenantId ?? user.tenantId);
    const granted = required.every((permission) => resolved.permissions.includes(permission));
    if (!granted) {
      await this.audit.record({
        tenantId: request.tenantId ?? user.tenantId,
        actorUserId: user.sub,
        action: AuditAction.AUTH_FORBIDDEN,
        resourceType: 'RoutePermission',
        metadata: {
          required,
          jwtRole: user.role,
          resolvedRole: resolved.role ?? null,
          source: resolved.source,
        },
      });
      throw new ForbiddenException(
        `Missing required permission(s): ${required.join(', ')}`,
      );
    }

    return true;
  }
}
