import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import {
  ModuleCatalogStatus,
  ModuleRolloutState,
  ModuleTier,
  ModuleVisibility,
} from '@prisma/client';

export class PlatformUsageMetricsQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  billingPeriod?: string;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class PlatformModuleQueryDto {
  @IsOptional()
  @IsString()
  module?: string;
}

export class PlatformPolicyQueryDto {
  @IsOptional()
  @IsString()
  policy?: string;
}

export class UpdatePlatformModuleGovernanceDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  storeVisible?: boolean;

  @IsOptional()
  @IsEnum(ModuleCatalogStatus)
  status?: ModuleCatalogStatus;

  @IsOptional()
  @IsEnum(ModuleVisibility)
  visibility?: ModuleVisibility;

  @IsOptional()
  @IsEnum(ModuleRolloutState)
  rolloutState?: ModuleRolloutState;

  @IsOptional()
  @IsEnum(ModuleTier)
  tier?: ModuleTier;
}

export class UpdatePlatformPolicyDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
