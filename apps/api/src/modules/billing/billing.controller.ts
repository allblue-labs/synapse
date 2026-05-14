import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { IsBoolean, IsEnum, IsIn, IsInt, IsObject, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { Request } from 'express';
import { BillingPlanStatus } from '@prisma/client';
import { BillingPlanKey } from '@synapse/contracts';
import { AllowTenantless, Permissions, Public } from '../../common/authorization';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { BillingService } from './billing.service';

class SetFeatureFlagDto {
  @IsBoolean()
  enabled!: boolean;
}

class CreateCheckoutSessionDto {
  @IsIn(['light', 'pro', 'premium'])
  planKey!: BillingPlanKey;

  @IsUrl({ require_tld: false })
  successUrl!: string;

  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}

class CreatePortalSessionDto {
  @IsUrl({ require_tld: false })
  returnUrl!: string;
}

class UpsertBillingPlanDto {
  @IsString()
  displayName!: string;

  @IsOptional()
  @IsEnum(BillingPlanStatus)
  status?: BillingPlanStatus;

  @IsOptional()
  @IsString()
  commercialFeatureFlag?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  requiredPublicModules?: number;

  @IsOptional()
  @IsObject()
  entitlements?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
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

  @AllowTenantless()
  @Permissions('billing:manage')
  @Get('plans/:key')
  getPlan(@Param('key') key: string) {
    return this.billing.getPlan(key);
  }

  @AllowTenantless()
  @Permissions('billing:manage')
  @Patch('plans/:key')
  upsertPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('key') key: string,
    @Body() dto: UpsertBillingPlanDto,
  ) {
    return this.billing.upsertPlan({
      key,
      displayName: dto.displayName,
      status: dto.status,
      commercialFeatureFlag: dto.commercialFeatureFlag,
      requiredPublicModules: dto.requiredPublicModules,
      entitlements: dto.entitlements,
      metadata: dto.metadata,
      actorUserId: user.sub,
    });
  }

  @AllowTenantless()
  @Permissions('billing:manage')
  @Delete('plans/:key')
  deletePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('key') key: string,
  ) {
    return this.billing.deletePlan(key, user.sub);
  }

  @Public()
  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  stripeWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Stripe webhook raw body is required.');
    }

    return this.billing.processStripeWebhook(req.rawBody, signature);
  }

  @Permissions('billing:manage')
  @Post('checkout/subscription')
  createSubscriptionCheckout(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.billing.createSubscriptionCheckoutSession({
      tenantId,
      actorUserId: user.sub,
      actorEmail: user.email,
      planKey: dto.planKey,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
    });
  }

  @Permissions('billing:manage')
  @Post('portal/session')
  createPortalSession(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePortalSessionDto,
  ) {
    return this.billing.createPortalSession({
      tenantId,
      actorUserId: user.sub,
      returnUrl: dto.returnUrl,
    });
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
