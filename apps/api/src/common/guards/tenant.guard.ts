import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser } from '../types/authenticated-user';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
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
