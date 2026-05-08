import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { ExecutionStatus } from '@prisma/client';

export class RequestRuntimeExecutionDto {
  @IsString()
  moduleSlug!: string;

  @IsString()
  requestType!: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsObject()
  input!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class TransitionRuntimeExecutionDto {
  @IsIn([
    ExecutionStatus.QUEUED,
    ExecutionStatus.RUNNING,
    ExecutionStatus.SUCCEEDED,
    ExecutionStatus.FAILED,
    ExecutionStatus.CANCELLED,
    ExecutionStatus.TIMED_OUT,
  ])
  status!: ExecutionStatus;

  @IsOptional()
  @IsObject()
  output?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class CancelRuntimeExecutionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
