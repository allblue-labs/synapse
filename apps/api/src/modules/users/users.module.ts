import { Module } from '@nestjs/common';
import { PlatformUsersController } from './platform-users.controller';
import { PlatformUsersService } from './platform-users.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, PlatformUsersController],
  providers: [UsersService, PlatformUsersService],
  exports: [UsersService, PlatformUsersService]
})
export class UsersModule {}
