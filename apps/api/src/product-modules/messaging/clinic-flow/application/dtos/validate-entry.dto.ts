import {IsObject, IsOptional, IsString} from 'class-validator';
import {ClinicFlowExtractedData} from '../../contracts/clinic-flow.contracts';

export class ValidateEntryDto {
  @IsOptional()
  @IsObject()
  extractedData?: ClinicFlowExtractedData;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}
