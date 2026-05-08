import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { IntegrationProvider, IntegrationStatus } from '@prisma/client';

export const PULSE_SCHEDULING_PROVIDERS = [
  IntegrationProvider.GOOGLE_CALENDAR,
  IntegrationProvider.OUTLOOK_CALENDAR,
  IntegrationProvider.CALENDLY,
] as const;

export class PulseSchedulingIntegrationListDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsIn(PULSE_SCHEDULING_PROVIDERS)
  provider?: IntegrationProvider;

  @IsOptional()
  @IsIn([
    IntegrationStatus.ACTIVE,
    IntegrationStatus.DISCONNECTED,
    IntegrationStatus.NEEDS_ATTENTION,
    IntegrationStatus.DISABLED,
  ])
  status?: IntegrationStatus;
}

export class PrepareSchedulingAvailabilityDto {
  @IsIn(PULSE_SCHEDULING_PROVIDERS)
  provider!: IntegrationProvider;

  @IsString()
  integrationId!: string;

  @IsDateString()
  windowStart!: string;

  @IsDateString()
  windowEnd!: string;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes!: number;

  @IsString()
  timezone!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SchedulingParticipantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class PrepareSchedulingBookingDto extends PrepareSchedulingAvailabilityDto {
  @IsDateString()
  slotStartsAt!: string;

  @ValidateNested()
  @Type(() => SchedulingParticipantDto)
  participant!: SchedulingParticipantDto;
}
