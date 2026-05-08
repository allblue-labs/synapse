/**
 * Pulse — frontend UI contracts.
 *
 * These shapes are *UI-facing view models* — what each operational
 * screen needs to render. They are intentionally a superset of the
 * backend Prisma entities so a single fetch can drive a screen
 * without N+1 round-trips. When the backend ships matching DTO/OpenAPI
 * contracts (Stage 1C), each `loadX(...)` in `fixtures.ts` becomes a
 * one-liner against the real API client.
 *
 * Naming follows the canonical product schema:
 *   - PulseTicket / PulseTicketEvent  → from `PulseTicket` + `PulseOperationalEvent`
 *   - confidence                       → 0..1, never a percent
 *   - state                            → workflow position (FSM), distinct from `status`
 */

import type {Permission, UserRole} from '@synapse/contracts';

// ─── Re-export the backend contract enums we use in the UI ─────────────

export type {Permission, UserRole};

// Mirror of @synapse/contracts.PulseTicketStatus — re-exported so consumer
// code only needs to import from here.
export type PulseTicketStatus =
  | 'OPEN'
  | 'PENDING_REVIEW'
  | 'WAITING_CUSTOMER'
  | 'RESOLVED'
  | 'CANCELLED';

export type PulseTicketType =
  | 'SUPPORT'
  | 'SALES'
  | 'SCHEDULING'
  | 'MARKETING'
  | 'OPERATOR_REVIEW'
  | 'KNOWLEDGE_REQUEST';

export type PulseSkillType =
  | 'SCHEDULER'
  | 'SALES'
  | 'SUPPORT'
  | 'KNOWLEDGE'
  | 'MARKETING'
  | 'OPERATOR';

export type PulseActorType = 'SYSTEM' | 'USER' | 'CUSTOMER' | 'AI' | 'INTEGRATION';

export type PulseConversationState =
  | 'NEW'
  | 'IN_FLOW'
  | 'WAITING_CUSTOMER'
  | 'WAITING_OPERATOR'
  | 'RESOLVED'
  | 'CANCELLED';

export type PulseChannelProvider = 'WHATSAPP' | 'TELEGRAM';

export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

// ─── Domain shapes ───────────────────────────────────────────────────

/** One row in the operational timeline. */
export interface PulseTimelineEvent {
  id: string;
  /** Stable kind for filtering / icon mapping. */
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
    /** Display name. For AI events, the model + skill (e.g. "gpt-4.1-mini · Scheduler"). */
    label: string;
  };
  /** Plain-language summary of the event. */
  summary: string;
  /** Optional structured payload (extracted fields, tool args, etc.). */
  payload?: Record<string, string | number | boolean | null>;
  /** AI-only: 0..1 confidence for the decision/extraction. */
  confidence?: number;
  occurredAt: string;
}

/** Single operational ticket — what the detail screen renders against. */
export interface PulseTicketDetail {
  id: string;
  type: PulseTicketType;
  status: PulseTicketStatus;
  priority: Priority;
  skill: PulseSkillType;
  confidence: number;

  customer: {
    handle: string;
    displayName?: string;
    channel: PulseChannelProvider;
  };

  /** Latest extracted context the AI captured. Free-form by intent. */
  extracted: {
    intent?: string;
    fields: ReadonlyArray<{label: string; value: string}>;
  };

  workflow: {
    state: PulseConversationState;
    /** Active playbook step, when a playbook is bound to the ticket. */
    playbookStep?: {
      playbookName: string;
      stepIndex: number;
      stepCount: number;
      stepLabel: string;
    };
  };

  /** Quick AI summary of the conversation so far. */
  aiSummary?: string;

  /** Pending operator review reasoning when status === 'PENDING_REVIEW'. */
  reviewRationale?: string;

  timeline: ReadonlyArray<PulseTimelineEvent>;

  createdAt: string;
  updatedAt: string;

  /**
   * Permissions required to take operator actions on this ticket.
   * Pre-resolved server-side once contracts ship; carrying them here
   * keeps the UI decoupled from the role→permission map.
   */
  capabilities: {
    canApprove: boolean;
    canReject: boolean;
    canEscalate: boolean;
    canResolve: boolean;
    canReopen: boolean;
  };
}

/** A row in the inbox / tickets list — slimmer view of the ticket. */
export interface PulseTicketRow {
  id: string;
  type: PulseTicketType;
  status: PulseTicketStatus;
  priority: Priority;
  skill: PulseSkillType;
  confidence: number;
  customer: {
    handle: string;
    displayName?: string;
    channel: PulseChannelProvider;
  };
  /** A 1-line summary for the row preview (extracted by the AI). */
  preview: string;
  /** Tag emitted when the operator must intervene — drives the badge. */
  needsReview: boolean;
  /** True if a playbook step has escalated. */
  escalated: boolean;
  createdAt: string;
  updatedAt: string;
}
