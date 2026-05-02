import { IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  channelAccountId!: string;

  @IsString()
  externalContactId!: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  contactDisplayName?: string;
}
