import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  PulseKnowledgeContextStatus,
  PulseKnowledgeContextType,
} from '@prisma/client';

const KNOWLEDGE_CONTEXT_TYPES = [
  PulseKnowledgeContextType.FAQ,
  PulseKnowledgeContextType.BUSINESS_DESCRIPTION,
  PulseKnowledgeContextType.OPERATIONAL_INSTRUCTION,
  PulseKnowledgeContextType.PRODUCT_SERVICE,
  PulseKnowledgeContextType.CAMPAIGN_PROMOTION,
] as const;

export class PulseKnowledgeContextListDto {
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
  @IsIn(KNOWLEDGE_CONTEXT_TYPES)
  type?: PulseKnowledgeContextType;

  @IsOptional()
  @IsIn([PulseKnowledgeContextStatus.ACTIVE, PulseKnowledgeContextStatus.ARCHIVED])
  status?: PulseKnowledgeContextStatus;

  @IsOptional()
  @IsString()
  query?: string;
}

export class PublishPulseKnowledgeContextDto {
  @IsIn(KNOWLEDGE_CONTEXT_TYPES)
  type!: PulseKnowledgeContextType;

  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class QueryPulseKnowledgeContextDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsIn(KNOWLEDGE_CONTEXT_TYPES)
  type?: PulseKnowledgeContextType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 5;
}
