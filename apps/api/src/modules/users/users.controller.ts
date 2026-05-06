import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { UsersService } from './users.service';

/**
 * `/users/me` is intentionally *not* gated by `@Permissions(...)` — every
 * authenticated user must be able to read their own session, regardless of
 * role. The global JwtAuthGuard + TenantGuard still apply.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(tenantId, user.sub);
  }
}
