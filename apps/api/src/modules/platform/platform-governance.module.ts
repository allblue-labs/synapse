import { Module } from '@nestjs/common';
import { UsageModule } from '../usage/usage.module';
import { PlatformGovernanceController } from './platform-governance.controller';
import { PlatformGovernanceService } from './platform-governance.service';
import { PlatformScopeService } from './platform-scope.service';

@Module({
  imports: [UsageModule],
  controllers: [PlatformGovernanceController],
  providers: [PlatformGovernanceService, PlatformScopeService],
  exports: [PlatformGovernanceService, PlatformScopeService],
})
export class PlatformGovernanceModule {}
