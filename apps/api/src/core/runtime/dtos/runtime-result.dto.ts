import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

const TERMINAL_EXECUTION_STATUSES = [
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'TIMED_OUT',
] as const;

export class RuntimeResultDto {
  @IsString()
  tenantId!: string;

  @IsString()
  executionRequestId!: string;

  @IsIn(TERMINAL_EXECUTION_STATUSES)
  status!: typeof TERMINAL_EXECUTION_STATUSES[number];

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
