import { Prisma, PulseActionExecutionStatus } from '@prisma/client';

export const PULSE_ACTION_EXECUTION_REPOSITORY = Symbol('PULSE_ACTION_EXECUTION_REPOSITORY');

export type PulseActionExecutionClaimState = 'claimed' | 'already_succeeded' | 'in_progress';

export interface PulseActionExecutionRecord {
  id: string;
  tenantId: string;
  action: string;
  idempotencyKey: string;
  ticketId: string | null;
  conversationId: string | null;
  status: PulseActionExecutionStatus;
  attempts: number;
  metadata: Prisma.JsonValue;
  errorMessage: string | null;
}

export interface PulseActionExecutionClaim {
  state: PulseActionExecutionClaimState;
  record: PulseActionExecutionRecord;
}

export interface BeginPulseActionExecutionInput {
  tenantId: string;
  action: string;
  idempotencyKey: string;
  ticketId?: string | null;
  conversationId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface IPulseActionExecutionRepository {
  begin(input: BeginPulseActionExecutionInput): Promise<PulseActionExecutionClaim>;
  markSucceeded(tenantId: string, idempotencyKey: string, metadata?: Prisma.InputJsonValue): Promise<void>;
  markFailed(tenantId: string, idempotencyKey: string, errorMessage: string, metadata?: Prisma.InputJsonValue): Promise<void>;
}
