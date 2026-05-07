import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { IsBoolean, IsIn, IsUrl } from 'class-validator';
import { Request } from 'express';
import { BillingPlanKey } from '@synapse/contracts';
import { Permissions, Public } from '../../common/authorization';
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
