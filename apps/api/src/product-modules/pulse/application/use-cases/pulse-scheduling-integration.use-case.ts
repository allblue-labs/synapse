import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationStatus } from '@prisma/client';
import { UsageMeteringService, UsageMetricType } from '../../../../modules/usage/usage-metering.service';
import {
  IPulseIntegrationSettingRepository,
  PULSE_INTEGRATION_SETTING_REPOSITORY,
  PulseIntegrationSettingFilter,
} from '../../domain/ports/pulse-integration-setting-repository.port';

@Injectable()
export class PulseSchedulingIntegrationUseCase {
  constructor(
    @Inject(PULSE_INTEGRATION_SETTING_REPOSITORY)
    private readonly integrations: IPulseIntegrationSettingRepository,
    private readonly usage: UsageMeteringService,
  ) {}

  list(tenantId: string, filter?: PulseIntegrationSettingFilter) {
    return this.integrations.list(tenantId, filter);
  }

  async get(tenantId: string, id: string) {
    const integration = await this.integrations.findById(tenantId, id);
    if (!integration) {
      throw new NotFoundException('Pulse scheduling integration not found.');
    }
    return integration;
  }

  async prepareAvailability(
    tenantId: string,
    input: {
      provider: string;
      integrationId: string;
      windowStart: string;
      windowEnd: string;
      durationMinutes: number;
      timezone: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const integration = await this.requireReadyIntegration(
      tenantId,
      input.integrationId,
      input.provider,
    );
    await this.usage.record({
      tenantId,
      moduleSlug: 'pulse',
      metricType: UsageMetricType.AUTOMATION_EXECUTION,
      quantity: 1,
      unit: 'scheduling_availability_prepare',
      resourceType: 'IntegrationSetting',
      resourceId: integration.id,
      idempotencyKey: `pulse-scheduling-availability-prepare:${integration.id}:${input.windowStart}:${input.windowEnd}:${input.durationMinutes}`,
      metadata: {
        provider: integration.provider,
        timezone: input.timezone,
      },
    });
    return {
      prepared: true,
      executable: false,
      reason: 'provider_call_not_implemented',
      provider: integration.provider,
      integrationId: integration.id,
      request: input,
    };
  }

  async prepareBooking(
    tenantId: string,
    input: {
      provider: string;
      integrationId: string;
      windowStart: string;
      windowEnd: string;
      durationMinutes: number;
      timezone: string;
      slotStartsAt: string;
      participant: { name?: string; email?: string; phone?: string };
      metadata?: Record<string, unknown>;
    },
  ) {
    const integration = await this.requireReadyIntegration(
      tenantId,
      input.integrationId,
      input.provider,
    );
    await this.usage.record({
      tenantId,
      moduleSlug: 'pulse',
      metricType: UsageMetricType.AUTOMATION_EXECUTION,
      quantity: 1,
      unit: 'scheduling_booking_prepare',
      resourceType: 'IntegrationSetting',
      resourceId: integration.id,
      idempotencyKey: `pulse-scheduling-booking-prepare:${integration.id}:${input.slotStartsAt}:${input.durationMinutes}`,
      metadata: {
        provider: integration.provider,
        timezone: input.timezone,
      },
    });
    return {
      prepared: true,
      executable: false,
      reason: 'provider_call_not_implemented',
      provider: integration.provider,
      integrationId: integration.id,
      request: input,
    };
  }

  private async requireReadyIntegration(tenantId: string, integrationId: string, provider: string) {
    const integration = await this.integrations.findById(tenantId, integrationId);
    if (!integration) {
      throw new NotFoundException('Pulse scheduling integration not found.');
    }

    if (integration.provider !== provider) {
      throw new BadRequestException('Scheduling provider does not match integration.');
    }

    if (integration.status !== IntegrationStatus.ACTIVE || !integration.credentialsConfigured) {
      throw new BadRequestException('Scheduling integration is not ready.');
    }

    return integration;
  }
}
