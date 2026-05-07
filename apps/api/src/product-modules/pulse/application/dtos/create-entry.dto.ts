import {IsIn, IsOptional, IsString, IsUrl, MinLength} from 'class-validator';
import {PulseChannelProvider} from '@prisma/client';

export class CreateEntryDto {
  @IsString()
  @MinLength(1)
  contactPhone!: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  originalMessage?: string;

  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsIn([PulseChannelProvider.WHATSAPP, PulseChannelProvider.TELEGRAM])
  provider?: PulseChannelProvider;

  @IsOptional()
  @IsString()
  channelIdentifier?: string;

  @IsOptional()
  @IsString()
  participantRef?: string;

  @IsOptional()
  @IsString()
  participantLabel?: string;
}
