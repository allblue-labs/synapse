import { Controller, Get } from '@nestjs/common';
import { AllowTenantless } from '../../common/authorization';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { UsersService } from './users.service';

/**
 * `/users/me` is intentionally *not* gated by `@Permissions(...)` — every
 * authenticated user must be able to read their own session, regardless of
 * role. Platform admins are tenantless; tenant users are resolved through
 * their authenticated tenant context.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @AllowTenantless()
  me(@TenantId() tenantId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(tenantId, user.sub);
  }
}
