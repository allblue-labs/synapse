import { Controller, Get, Query } from '@nestjs/common';
import { IsOptional, Matches } from 'class-validator';
import { Permissions } from '../../common/authorization';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { UsageMeteringService } from './usage-metering.service';

class UsageSummaryQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  billingPeriod?: string;
}

@Controller('usage')
export class UsageController {
  constructor(private readonly usage: UsageMeteringService) {}

  @Permissions('billing:read')
  @Get('summary')
  summary(@TenantId() tenantId: string, @Query() query: UsageSummaryQueryDto) {
    const billingPeriod = query.billingPeriod ?? this.usage.billingPeriodFor(new Date());
    return this.usage.summarizeTenantPeriod(tenantId, billingPeriod);
  }
}
