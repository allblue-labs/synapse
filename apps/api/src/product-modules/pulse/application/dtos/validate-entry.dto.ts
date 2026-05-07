import {IsObject, IsOptional, IsString} from 'class-validator';
import {PulseExtractedData} from '../../contracts/pulse.contracts';

export class ValidateEntryDto {
  @IsOptional()
  @IsObject()
  extractedData?: PulseExtractedData;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}
