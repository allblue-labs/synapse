import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { UsersService } from './users.service';

@UseGuards(AuthGuard('jwt'), TenantGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(tenantId, user.sub);
  }
}
