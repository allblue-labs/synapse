import { IsArray, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { TenantContextQuestionMode } from '@prisma/client';

export class StartTenantContextProfileDto {
  @IsOptional()
  @IsIn([TenantContextQuestionMode.LLM, TenantContextQuestionMode.MANUAL_FORM])
  mode?: TenantContextQuestionMode;
}

export class SaveTenantContextAnswerDto {
  @IsString()
  questionKey!: string;

  answer!: unknown;

  @IsOptional()
  @IsIn([TenantContextQuestionMode.LLM, TenantContextQuestionMode.MANUAL_FORM])
  mode?: TenantContextQuestionMode;
}

export class SubmitTenantContextFormDto {
  @IsString()
  businessName!: string;

  @IsString()
  businessType!: string;

  @IsString()
  businessDescription!: string;

  @IsArray()
  productsServices!: string[];

  @IsString()
  targetAudience!: string;

  @IsString()
  communicationTone!: string;

  @IsArray()
  preferredLanguages!: string[];

  @IsString()
  customerSupportStyle!: string;

  @IsString()
  salesBehavior!: string;

  @IsArray()
  generalGoals!: string[];

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsArray()
  socialMedia?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectTenantContextSummaryDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class EditTenantContextAnswersDto {
  @IsObject()
  answers!: Record<string, unknown>;
}
