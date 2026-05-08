import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { AllowTenantless, Permissions } from '../../common/authorization';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import {
  PlatformModuleQueryDto,
  PlatformPolicyQueryDto,
  PlatformUsageMetricsQueryDto,
  UpdatePlatformModuleGovernanceDto,
  UpdatePlatformPolicyDto,
} from './dto/platform-governance.dto';
import { PlatformGovernanceService } from './platform-governance.service';

@AllowTenantless()
@Controller('platform')
export class PlatformGovernanceController {
  constructor(private readonly governance: PlatformGovernanceService) {}

  @Permissions('platform:metrics:read')
  @Get('metrics/usage')
  usageMetrics(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: PlatformUsageMetricsQueryDto,
  ) {
    return this.governance.usageMetrics(actor, query);
  }

  @Permissions('platform:modules:manage')
  @Get('modules')
  modules(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: PlatformModuleQueryDto,
  ) {
    return this.governance.modules(actor, query);
  }

  @Permissions('platform:policies:manage')
  @Get('policies')
  policies(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: PlatformPolicyQueryDto,
  ) {
    return this.governance.policies(actor, query);
  }

  @Permissions('platform:modules:manage')
  @Patch('modules/:module/governance')
  updateModuleGovernance(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('module') module: string,
    @Body() dto: UpdatePlatformModuleGovernanceDto,
  ) {
    return this.governance.updateModuleGovernance(actor, module, dto);
  }

  @Permissions('platform:policies:manage')
  @Patch('policies/:policy')
  updatePolicy(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('policy') policy: string,
    @Body() dto: UpdatePlatformPolicyDto,
  ) {
    return this.governance.updatePolicy(actor, policy, dto);
  }
}
