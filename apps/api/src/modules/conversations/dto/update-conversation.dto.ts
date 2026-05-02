import { ConversationStatus } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateConversationDto {
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsObject()
  extractedData?: Record<string, unknown>;
}
