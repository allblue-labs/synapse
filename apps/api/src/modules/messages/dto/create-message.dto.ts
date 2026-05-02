import { MessageAuthorType, MessageDirection } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  conversationId!: string;

  @IsOptional()
  @IsString()
  externalMessageId?: string;

  @IsEnum(MessageDirection)
  direction!: MessageDirection;

  @IsEnum(MessageAuthorType)
  authorType!: MessageAuthorType;

  @IsString()
  content!: string;

  @IsOptional()
  @IsObject()
  normalizedPayload?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  providerPayload?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
