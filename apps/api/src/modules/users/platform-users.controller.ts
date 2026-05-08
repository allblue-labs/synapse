import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AllowTenantless, Permissions } from '../../common/authorization';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import {
  CreateCustomerUserDto,
  CreatePlatformAdminDto,
  CreatePlatformTesterDto,
  UpdatePlatformAccessDto,
} from './dto/platform-users.dto';
import { PlatformUsersService } from './platform-users.service';

@AllowTenantless()
@Controller('platform/users')
export class PlatformUsersController {
  constructor(private readonly platformUsers: PlatformUsersService) {}

  @Permissions('platform:users:read')
  @Get()
  list() {
    return this.platformUsers.list();
  }

  @Permissions('platform:users:manage_admins')
  @Post('admins')
  createAdmin(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreatePlatformAdminDto,
  ) {
    return this.platformUsers.createPlatformAdmin(actor, dto);
  }

  @Permissions('platform:users:manage_testers')
  @Post('testers')
  createTester(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreatePlatformTesterDto,
  ) {
    return this.platformUsers.createPlatformTester(actor, dto);
  }

  @Permissions('platform:users:manage_customers')
  @Post('customers')
  createCustomer(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateCustomerUserDto,
  ) {
    return this.platformUsers.createCustomerUser(actor, dto);
  }

  @Permissions('platform:users:manage_admins')
  @Patch(':userId/platform-access')
  updatePlatformAccess(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: UpdatePlatformAccessDto,
  ) {
    return this.platformUsers.updatePlatformAccess(actor, userId, dto);
  }
}
