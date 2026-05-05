import {IsOptional, IsString, IsUrl, MinLength} from 'class-validator';

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
}
