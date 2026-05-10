import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

const EXECUTION_STATUSES = [
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'TIMED_OUT',
] as const;

export class PulseRuntimeResultDto {
  @IsString()
  tenantId!: string;

  @IsString()
  executionRequestId!: string;

  @IsIn(EXECUTION_STATUSES)
  status!: typeof EXECUTION_STATUSES[number];

  @IsOptional()
  @IsObject()
  output?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsString()
  traceId?: string;
}
