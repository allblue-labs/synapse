import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PULSE_FLOW_STATE_VALUES, PulseFlowState } from '../../domain/pulse-flow-state-machine';

export class AssignTicketDto {
  @IsString()
  assignedUserId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ResolveTicketDto {
  @IsOptional()
  @IsString()
  resolutionSummary?: string;
}

export class ReopenTicketDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class EscalateTicketDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;
}

export class CancelTicketDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SubmitOperatorReviewDto {
  @IsString()
  summary!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @IsObject()
  decision?: Record<string, unknown>;
}

export class AdvanceFlowStateDto {
  @IsIn(PULSE_FLOW_STATE_VALUES)
  nextState!: PulseFlowState;

  @IsOptional()
  @IsIn(['manual', 'system', 'ai', 'integration'])
  transitionSource?: 'manual' | 'system' | 'ai' | 'integration';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsObject()
  aiDecisionSummary?: Record<string, unknown>;
}
