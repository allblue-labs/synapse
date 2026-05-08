/**
 * Pulse — frontend view models.
 *
 * Two layers:
 *
 *   1. Backend record types (re-exported from `lib/api.ts`) — these
 *      are the *source of truth*. They mirror the backend Prisma
 *      records and only carry fields the API actually returns.
 *
 *   2. UI view models (`PulseTicketRow`, `PulseTicketDetailVM`,
 *      `PulseTimelineEventVM`) — composed by the adapter in
 *      `lib/pulse/loaders.ts` from one or more record fetches. The
 *      adapter is the *only* place that translates wire shapes into
 *      view shapes; pages stay simple consumers.
 *
 * Rule: never import `PulseTicketRecord`/etc. directly into a page —
 * always go through the loader so any backend churn is absorbed in
 * one place.
 */

import type {
  PulseChannelProvider,
  PulseChannelRecord,
  PulseConversationRecord,
  PulseConversationState,
  PulseEventRecord,
  PulseOperationalStatus,
  PulseTicketDetailRecord,
  PulseTicketRecord,
  PulseTicketStatus,
  PulseTicketType,
} from '@/lib/api';

export type {
  PulseChannelProvider,
  PulseChannelRecord,
  PulseConversationRecord,
  PulseConversationState,
  PulseEventRecord,
  PulseOperationalStatus,
  PulseTicketDetailRecord,
  PulseTicketRecord,
  PulseTicketStatus,
  PulseTicketType,
};

// ─── UI-only types kept local to the frontend ─────────────────────────

/**
 * Numeric backend `priority` (0..100, lower = more urgent on backend
 * convention) projected into named buckets the UI uses across pills,
 * counters and sort order.
 */
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

/**
 * Skill is *derived* from ticket type until the backend exposes a
 * skill column directly. Driven by the rule: ticket type → skill.
 * This keeps existing pill/icon mappings stable.
 */
export type PulseSkillType =
  | 'SCHEDULER'
  | 'SALES'
  | 'SUPPORT'
  | 'KNOWLEDGE'
  | 'MARKETING'
  | 'OPERATOR';

/**
 * Actor type for timeline event avatars. Resolved from the wire `type`
 * string by the adapter (see `lib/pulse/loaders.ts`).
 */
export type PulseActorType = 'SYSTEM' | 'USER' | 'CUSTOMER' | 'AI' | 'INTEGRATION';

// ─── View models ─────────────────────────────────────────────────────

/** Slim row for inbox / tickets list. Composed from ticket + conversation. */
export interface PulseTicketRow {
  id: string;
  type: PulseTicketType;
  status: PulseTicketStatus;
  /** Bucketed from backend numeric `priority`. */
  priority: Priority;
  /** Derived from `type` until the backend exposes skill directly. */
  skill: PulseSkillType;
  /** 0..1, or `null` when the backend hasn't computed one yet. */
  confidence: number | null;
  customer: {
    handle: string;
    displayName: string | null;
    channel: PulseChannelProvider | null;
  };
  /** Best-effort 1-line preview. May be empty pre-enrichment. */
  preview: string;
  /** Flag rows that need operator action. Drives the queue layout. */
  needsReview: boolean;
  /** Currently true only when priority bucket = URGENT and status = PENDING_REVIEW. */
  escalated: boolean;
  updatedAt: string;
}

/**
 * Single timeline event projected to the renderer. The `kind` union
 * mirrors the OperationalTimeline icon table — unknown wire types
 * fall through to `'note.added'` so the UI stays robust.
 */
export interface PulseTimelineEventVM {
  id: string;
  /** Original wire `type` (`pulse.entry.received`, etc.) — kept for tooltips. */
  rawType: string;
  kind:
    | 'ticket.opened'
    | 'message.inbound'
    | 'message.outbound'
    | 'ai.extracted'
    | 'ai.decision'
    | 'skill.routed'
    | 'playbook.step'
    | 'operator.review'
    | 'operator.approved'
    | 'operator.rejected'
    | 'status.changed'
    | 'integration.action'
    | 'note.added';
  actor: {
    type: PulseActorType;
    label: string;
  };
  summary: string;
  payload?: Record<string, string | number | boolean | null>;
  confidence?: number;
  occurredAt: string;
}

/** Ticket detail view — composes ticket detail + conversation + events. */
export interface PulseTicketDetailVM {
  id: string;
  type: PulseTicketType;
  status: PulseTicketStatus;
  priority: Priority;
  skill: PulseSkillType;
  confidence: number | null;
  assignedUserId: string | null;
  resolvedAt: string | null;

  customer: {
    handle: string;
    displayName: string | null;
    channel: PulseChannelProvider | null;
  };

  /**
   * Workflow snapshot. `state` reflects the conversation FSM (when a
   * conversation exists). `playbookStep` is reserved — the backend
   * doesn't expose it yet; the adapter leaves it `null`.
   */
  workflow: {
    state: PulseConversationState | null;
    playbookStep: null;
  };

  /** Reserved for future enrichment. The adapter currently emits empty fields. */
  extracted: {
    intent: string | null;
    fields: ReadonlyArray<{label: string; value: string}>;
  };

  /** Summary string from ticket metadata when present. Always render with care. */
  aiSummary: string | null;

  /**
   * Why is this in operator review? Populated from event/metadata when
   * the ticket is in `PENDING_REVIEW`. Null otherwise.
   */
  reviewRationale: string | null;

  timeline: ReadonlyArray<PulseTimelineEventVM>;

  /** Source-of-truth permission checks live in `<Can>` against the user's
   *  permissions; this struct is a hint to disable buttons that would
   *  break the FSM regardless of role. */
  capabilities: {
    canApprove: boolean;
    canReject: boolean;
    canEscalate: boolean;
    canResolve: boolean;
    canReopen: boolean;
    priority: Priority;
  };
}
