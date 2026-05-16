import { Module } from '@nestjs/common';
import { TenantContextController } from './tenant-context.controller';
import { TenantContextService } from './tenant-context.service';
import { LocalTenantProfileInterviewExecutor } from './tenant-profile-interview.executor';

@Module({
  controllers: [TenantContextController],
  providers: [TenantContextService, LocalTenantProfileInterviewExecutor],
  exports: [TenantContextService],
})
export class TenantContextModule {}
