import { Module } from '@nestjs/common';
import { PermissionResolverService } from '../../common/authorization';
import { BillingModule } from '../billing/billing.module';
import { PlatformUsersController } from './platform-users.controller';
import { PlatformUsersService } from './platform-users.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [BillingModule],
  controllers: [UsersController, PlatformUsersController, MembershipsController],
  providers: [UsersService, PlatformUsersService, MembershipsService, PermissionResolverService],
  exports: [UsersService, PlatformUsersService, MembershipsService]
})
export class UsersModule {}
