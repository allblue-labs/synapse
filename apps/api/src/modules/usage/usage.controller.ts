import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { UsageMetricType } from '@prisma/client';
import { Permissions } from '../../common/authorization';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { UsageMeteringService } from './usage-metering.service';

class UsageSummaryQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  billingPeriod?: string;
}

class RateUsageQueryDto extends UsageSummaryQueryDto {
  @IsOptional()
  @IsString()
  currency?: string;
}

class SetUsageRateDto {
  @IsEnum(UsageMetricType)
  metricType!: UsageMetricType;

  @IsString()
  unit!: string;

  @IsNumber()
  @Min(0)
  unitPriceCents!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class SetStripeMeterDto {
  @IsEnum(UsageMetricType)
  metricType!: UsageMetricType;

  @IsString()
  unit!: string;

  @IsString()
  stripeEventName!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valueMultiplier?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
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

  @Permissions('billing:read')
  @Get('rated-summary')
  ratedSummary(@TenantId() tenantId: string, @Query() query: RateUsageQueryDto) {
    const billingPeriod = query.billingPeriod ?? this.usage.billingPeriodFor(new Date());
    return this.usage.rateTenantPeriod(tenantId, billingPeriod, query.currency);
  }

  @Permissions('billing:manage')
  @Get('rates')
  rates() {
    return this.usage.listRates();
  }

  @Permissions('billing:manage')
  @Post('rates')
  setRate(@Body() dto: SetUsageRateDto) {
    return this.usage.setRate(dto);
  }

  @Permissions('billing:manage')
  @Get('stripe-meters')
  stripeMeters() {
    return this.usage.listStripeMeters();
  }

  @Permissions('billing:manage')
  @Post('stripe-meters')
  setStripeMeter(@Body() dto: SetStripeMeterDto) {
    return this.usage.setStripeMeter(dto);
  }

  @Permissions('billing:manage')
  @Post('stripe-report')
  reportToStripe(@TenantId() tenantId: string, @Query() query: RateUsageQueryDto) {
    const billingPeriod = query.billingPeriod ?? this.usage.billingPeriodFor(new Date());
    return this.usage.reportTenantPeriodToStripe(tenantId, billingPeriod, query.currency);
  }
}
