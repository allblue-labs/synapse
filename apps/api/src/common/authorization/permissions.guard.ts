import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, roleHasAllPermissions, UserRole } from '@synapse/contracts';
import { AuthenticatedUser } from '../types/authenticated-user';
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
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user?.role) {
      // JwtAuthGuard should have rejected anonymous requests already, but be
      // defensive: never let an unauthenticated request reach a permissioned route.
      throw new ForbiddenException('Authentication required.');
    }

    const granted = roleHasAllPermissions(user.role as UserRole, required);
    if (!granted) {
      throw new ForbiddenException(
        `Missing required permission(s): ${required.join(', ')}`,
      );
    }

    return true;
  }
}
