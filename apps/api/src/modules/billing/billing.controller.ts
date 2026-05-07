import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { Permissions } from '../../common/authorization';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { BillingService } from './billing.service';

class SetFeatureFlagDto {
  @IsBoolean()
  enabled!: boolean;
}

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Permissions('billing:read')
  @Get('account')
  account(@TenantId() tenantId: string) {
    return this.billing.getEntitlements(tenantId);
  }

  @Permissions('billing:read')
  @Get('plans')
  plans() {
    return this.billing.listPlans();
  }

  @Permissions('billing:manage')
  @Post('feature-flags/:key')
  setFeatureFlag(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('key') key: string,
    @Body() dto: SetFeatureFlagDto,
  ) {
    return this.billing.setFeatureFlag(key, dto.enabled, {
      tenantId,
      userId: user.sub,
    });
  }
}
