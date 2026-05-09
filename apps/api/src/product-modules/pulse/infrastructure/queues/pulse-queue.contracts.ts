import type { AuthRole, Permission } from '@synapse/contracts';
import {
  PulseActorType,
  PulseContextAssemblyInput,
  PulseContextExecutionType,
  PulseContextSkill,
} from '../../contracts/pulse.contracts';

export const PULSE_QUEUES = {
  INBOUND: 'pulse.inbound',
  CONTEXT: 'pulse.context',
  EXECUTION: 'pulse.execution',
  ACTIONS: 'pulse.actions',
  TIMELINE: 'pulse.timeline',
  FAILED: 'pulse.failed',
} as const;

export type PulseQueueName = typeof PULSE_QUEUES[keyof typeof PULSE_QUEUES];

export interface PulseQueueJobBase {
  tenantId: string;
  idempotencyKey: string;
  traceId?: string;
  requestedAt: string;
  source?: string;
}

export interface PulseInboundJob extends PulseQueueJobBase {
  entryId: string;
  conversationId?: string | null;
}

export interface PulseContextJob extends PulseQueueJobBase {
  skill: PulseContextSkill;
  executionType: PulseContextExecutionType;
  conversationId?: string;
  ticketId?: string;
  playbookKey?: string;
  knowledgeLimit?: number;
}

export interface PulseExecutionJob extends PulseQueueJobBase {
  executionRequestId: string;
  contextPackVersion: string;
}

export interface PulseActionJob extends PulseQueueJobBase {
  action: string;
  ticketId?: string;
  conversationId?: string;
  payload: Record<string, unknown>;
  actor?: {
    userId: string;
    email: string;
    role: AuthRole;
    permissions: Permission[];
  };
}

export interface PulseTimelineJob extends PulseQueueJobBase {
  eventId?: string;
  eventType: string;
  actorType?: PulseActorType;
  actorUserId?: string;
  channelId?: string | null;
  conversationId?: string | null;
  ticketId?: string | null;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export interface PulseFailedJob extends PulseQueueJobBase {
  failedQueue: PulseQueueName;
  failedJobId?: string;
  reason: string;
  payload: Record<string, unknown>;
}

export type PulseQueueJob =
  | PulseInboundJob
  | PulseContextJob
  | PulseExecutionJob
  | PulseActionJob
  | PulseTimelineJob
  | PulseFailedJob;

export function pulseContextJobFromAssemblyInput(
  input: PulseContextAssemblyInput,
  idempotencyKey: string,
): PulseContextJob {
  return {
    tenantId: input.tenantId,
    idempotencyKey,
    requestedAt: new Date().toISOString(),
    skill: input.skill,
    executionType: input.executionType,
    conversationId: input.conversationId,
    ticketId: input.ticketId,
    playbookKey: input.playbookKey,
    knowledgeLimit: input.knowledgeLimit,
    source: 'pulse.context',
  };
}
