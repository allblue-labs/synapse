import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { JsonLoggerService } from '../../../../common/logging/json-logger.service';

export type PulseActionTelemetryOutcome =
  | 'claimed'
  | 'already_succeeded'
  | 'in_progress'
  | 'succeeded'
  | 'failed'
  | 'skipped'
  | 'completed'
  | 'prepared';

export interface PulseActionTelemetryInput {
  tenantId: string;
  action: string;
  idempotencyKey?: string;
  ticketId?: string | null;
  conversationId?: string | null;
  outcome: PulseActionTelemetryOutcome;
  attempts?: number;
  failureClass?: string;
  reason?: string;
  sideEffectsApplied?: boolean;
  queue?: string;
}

@Injectable()
export class PulseActionTelemetryService {
  constructor(private readonly logger: JsonLoggerService) {}

  record(input: PulseActionTelemetryInput) {
    this.logger.write({
      level: this.levelFor(input.outcome),
      message: 'pulse_action_observed',
      context: 'PulseActionTelemetry',
      tenantId: input.tenantId,
      metadata: {
        action: input.action,
        outcome: input.outcome,
        idempotencyKeyHash: input.idempotencyKey ? this.hash(input.idempotencyKey) : undefined,
        ticketId: input.ticketId ?? undefined,
        conversationId: input.conversationId ?? undefined,
        attempts: input.attempts,
        failureClass: input.failureClass,
        reason: input.reason,
        sideEffectsApplied: input.sideEffectsApplied,
        queue: input.queue,
      },
    });
  }

  private levelFor(outcome: PulseActionTelemetryOutcome) {
    if (outcome === 'failed' || outcome === 'in_progress') {
      return 'warn' as const;
    }

    return 'log' as const;
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex').slice(0, 16);
  }
}
