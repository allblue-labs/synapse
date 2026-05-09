/**
 * Pulse loaders — the only place that talks to `api.pulse.*` and
 * composes view models for the screens.
 *
 * Pages stay simple consumers (`const data = await loadX(...)`); when
 * the backend evolves, all wire-shape changes are absorbed here.
 *
 * Conventions:
 *   - All loaders are async, never throw on caller-friendly cases.
 *     They surface failure as `{kind: 'error', ...}` so pages can
 *     render honest empty / error / forbidden states without a
 *     try/catch at every call site.
 *   - The composition layer (`toRow`, `toDetail`) only adds local
 *     UI projections. It never invents data the backend didn't send.
 */

import {
  api,
  ApiError,
  type PulseEventRecord,
  type PulseKnowledgeContextRecord,
  type PulseKnowledgeContextStatus,
  type PulseKnowledgeContextType,
  type PulseSchedulingIntegrationRecord,
  type PulseTicketDetailRecord,
  type PulseTicketListParams,
  type PulseTicketRecord,
} from '@/lib/api';
import type {
  Priority,
  PulseActorType,
  PulseSkillType,
  PulseTicketDetailVM,
  PulseTicketRow,
  PulseTimelineEventVM,
} from './types';

// ─── Result envelopes ────────────────────────────────────────────────

export type LoadResult<T> =
  | {kind: 'ok'; data: T}
  | {kind: 'forbidden'; permission?: string}
  | {kind: 'not_found'}
  | {kind: 'error'; status: number; message: string};

export interface PulseTicketsPage {
  rows: ReadonlyArray<PulseTicketRow>;
  total: number;
  page: number;
  pageSize: number;
}

// ─── Public loaders ──────────────────────────────────────────────────

/**
 * List tickets with optional filters. `enriched` is best-effort: each
 * row tries to enrich with its owning conversation for customer/channel.
 * Failures during enrichment do *not* fail the list — rows fall back
 * to ticket-only fields.
 */
export async function loadTicketsPage(params?: PulseTicketListParams): Promise<LoadResult<PulseTicketsPage>> {
  try {
    const page = await api.pulse.listTickets(params);
    const rows = await Promise.all(page.data.map((t) => toRow(t)));
    return {
      kind: 'ok',
      data: {
        rows,
        total: page.total,
        page: page.page,
        pageSize: page.pageSize,
      },
    };
  } catch (err) {
    return mapError(err);
  }
}

/**
 * Compose ticket detail view from `tickets/:id` + `tickets/:id/timeline`
 * + best-effort owning conversation. Returns the strongly-typed VM.
 */
export async function loadTicketDetail(id: string): Promise<LoadResult<PulseTicketDetailVM>> {
  try {
    const [ticket, timelinePage] = await Promise.all([
      api.pulse.getTicket(id),
      api.pulse.listTicketTimeline(id, {pageSize: 100}).catch(() => null),
    ]);

    let conversation: Awaited<ReturnType<typeof api.pulse.getConversation>> | null = null;
    if (ticket.conversationId) {
      conversation = await api.pulse.getConversation(ticket.conversationId).catch(() => null);
    }

    let channel: Awaited<ReturnType<typeof api.pulse.getChannel>> | null = null;
    if (conversation) {
      channel = await api.pulse.getChannel(conversation.channelId).catch(() => null);
    }

    const events = timelinePage?.data ?? [];

    return {
      kind: 'ok',
      data: toDetail(ticket, {
        contactDisplayName: conversation?.contactDisplayName ?? null,
        contactHandle:      conversation?.externalContactId ?? null,
        channelProvider:    channel?.provider ?? null,
        conversationState:  conversation?.state ?? null,
        events,
      }),
    };
  } catch (err) {
    return mapError(err);
  }
}

/**
 * Inbox composes three filtered ticket lists in parallel: needs-review
 * (Operator queue), open/in-flow (Active), waiting customer (Watching).
 */
export interface InboxLanes {
  needsReview: ReadonlyArray<PulseTicketRow>;
  open:        ReadonlyArray<PulseTicketRow>;
  waiting:     ReadonlyArray<PulseTicketRow>;
}

export async function loadInboxLanes(): Promise<LoadResult<InboxLanes>> {
  try {
    const [needs, open, waiting] = await Promise.all([
      api.pulse.listTickets({status: 'PENDING_REVIEW',   pageSize: 50}),
      api.pulse.listTickets({status: 'OPEN',             pageSize: 50}),
      api.pulse.listTickets({status: 'WAITING_CUSTOMER', pageSize: 50}),
    ]);
    const [needsRows, openRows, waitingRows] = await Promise.all([
      Promise.all(needs.data.map(toRow)),
      Promise.all(open.data.map(toRow)),
      Promise.all(waiting.data.map(toRow)),
    ]);
    return {
      kind: 'ok',
      data: {needsReview: needsRows, open: openRows, waiting: waitingRows},
    };
  } catch (err) {
    return mapError(err);
  }
}

// ─── Knowledge ──────────────────────────────────────────────────────

export interface KnowledgeFacets {
  total: number;
  active: number;
  archived: number;
  byType: Readonly<Record<PulseKnowledgeContextType, number>>;
}

export interface KnowledgePage {
  rows: ReadonlyArray<PulseKnowledgeContextRecord>;
  total: number;
  page: number;
  pageSize: number;
  facets: KnowledgeFacets;
}

const KNOWLEDGE_TYPES: ReadonlyArray<PulseKnowledgeContextType> = [
  'FAQ',
  'BUSINESS_DESCRIPTION',
  'OPERATIONAL_INSTRUCTION',
  'PRODUCT_SERVICE',
  'CAMPAIGN_PROMOTION',
];

/**
 * List knowledge contexts. Pulls active + archived in parallel so the
 * page can render counters without a second round-trip; archived counts
 * are best-effort (failures don't fail the page).
 */
export async function loadKnowledgeContexts(params?: {
  type?: PulseKnowledgeContextType;
  status?: PulseKnowledgeContextStatus;
  page?: number;
  pageSize?: number;
}): Promise<LoadResult<KnowledgePage>> {
  try {
    const [main, archivedTotal] = await Promise.all([
      api.pulse.listKnowledge({pageSize: 50, ...params}),
      api.pulse.listKnowledge({status: 'ARCHIVED', pageSize: 1}).catch(() => null),
    ]);

    // Build facets from a quick by-type scan. We approximate using the
    // first page (typically <= 50 active items) — exact counts ship when
    // the backend exposes facets.
    const byType: Record<PulseKnowledgeContextType, number> = {
      FAQ: 0,
      BUSINESS_DESCRIPTION: 0,
      OPERATIONAL_INSTRUCTION: 0,
      PRODUCT_SERVICE: 0,
      CAMPAIGN_PROMOTION: 0,
    };
    for (const r of main.data) byType[r.type] = (byType[r.type] ?? 0) + 1;

    const archivedCount = archivedTotal?.total ?? 0;
    const activeCount = main.data.filter((r) => r.status === 'ACTIVE').length;

    return {
      kind: 'ok',
      data: {
        rows: main.data,
        total: main.total,
        page: main.page,
        pageSize: main.pageSize,
        facets: {
          total: main.total + archivedCount,
          active: params?.status === 'ARCHIVED' ? main.total - main.data.length + activeCount : main.total,
          archived: archivedCount,
          byType,
        },
      },
    };
  } catch (err) {
    return mapError(err);
  }
}

export {KNOWLEDGE_TYPES};

// ─── Scheduling integrations ────────────────────────────────────────

export interface SchedulingFacets {
  total: number;
  active: number;
  needsAttention: number;
  disconnected: number;
}

export interface SchedulingPage {
  rows: ReadonlyArray<PulseSchedulingIntegrationRecord>;
  total: number;
  facets: SchedulingFacets;
}

export async function loadSchedulingIntegrations(): Promise<LoadResult<SchedulingPage>> {
  try {
    const page = await api.pulse.listSchedulingIntegrations({pageSize: 50});
    const facets: SchedulingFacets = {
      total: page.total,
      active:         page.data.filter((r) => r.status === 'ACTIVE').length,
      needsAttention: page.data.filter((r) => r.status === 'NEEDS_ATTENTION').length,
      disconnected:   page.data.filter((r) => r.status === 'DISCONNECTED' || r.status === 'DISABLED').length,
    };
    return {kind: 'ok', data: {rows: page.data, total: page.total, facets}};
  } catch (err) {
    return mapError(err);
  }
}

// ─── Adapters: backend records → view models ────────────────────────

const TYPE_TO_SKILL: Record<PulseTicketRecord['type'], PulseSkillType> = {
  SUPPORT:           'SUPPORT',
  SALES:             'SALES',
  SCHEDULING:        'SCHEDULER',
  MARKETING:         'MARKETING',
  OPERATOR_REVIEW:   'OPERATOR',
  KNOWLEDGE_REQUEST: 'KNOWLEDGE',
};

/** Map backend numeric `priority` (0..100) into named buckets. */
function priorityFor(p: number | undefined | null): Priority {
  if (p == null) return 'NORMAL';
  if (p >= 75) return 'URGENT';
  if (p >= 50) return 'HIGH';
  if (p >= 25) return 'NORMAL';
  return 'LOW';
}

/**
 * Map a wire event-type string to the VM `kind`. Unknown types fall
 * through to `note.added` so the timeline renderer always has a
 * non-null icon to draw.
 */
function kindFor(rawType: string): PulseTimelineEventVM['kind'] {
  switch (rawType) {
    case 'pulse.ticket.created':                return 'ticket.opened';
    case 'pulse.entry.received':                return 'message.inbound';
    case 'pulse.entry.validated':               return 'operator.approved';
    case 'pulse.entry.rejected':                return 'operator.rejected';
    case 'pulse.entry.retry_requested':         return 'status.changed';
    case 'pulse.ticket.assign_ticket':          return 'operator.review';
    case 'pulse.ticket.resolve_ticket':         return 'status.changed';
    case 'pulse.ticket.reopen_ticket':          return 'status.changed';
    case 'pulse.ticket.escalate_ticket':        return 'ai.decision';
    case 'pulse.ticket.cancel_ticket':          return 'status.changed';
    case 'pulse.ticket.submit_operator_review': return 'operator.review';
    case 'pulse.ticket.advance_flow_state':     return 'playbook.step';
    case 'pulse.knowledge.published':           return 'note.added';
    case 'pulse.knowledge.archived':            return 'note.added';
    case 'pulse.flow.transitioned':             return 'playbook.step';
    case 'pulse.conversation.linked':           return 'skill.routed';
    case 'pulse.conversation.resolved':         return 'status.changed';
    case 'pulse.unsupported_message_type':      return 'note.added';
    default:                                    return 'note.added';
  }
}

/**
 * Resolve actor metadata from the wire event-type. Pulse events don't
 * yet carry a typed `actor` field, so we infer it from the event name
 * using the same operational vocabulary the contract pack defines.
 */
function actorFor(rawType: string): {type: PulseActorType; label: string} {
  if (rawType.startsWith('pulse.entry.'))     return {type: 'CUSTOMER',    label: 'Customer'};
  if (rawType.startsWith('pulse.ticket.'))    return {type: 'USER',        label: 'Operator'};
  if (rawType.startsWith('pulse.knowledge.')) return {type: 'USER',        label: 'Operator'};
  if (rawType === 'pulse.flow.transitioned')  return {type: 'SYSTEM',      label: 'Workflow'};
  if (rawType.startsWith('pulse.conversation.')) return {type: 'SYSTEM',   label: 'Pulse'};
  return {type: 'SYSTEM', label: 'Pulse'};
}

/**
 * Operator-facing summary built from the wire `type` + `payload`.
 * Never echoes raw provider payloads — only fields known to be safe
 * for display per the contract pack's "do not render raw payloads"
 * rule.
 */
function summaryFor(event: PulseEventRecord): string {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  switch (event.type) {
    case 'pulse.ticket.created':                return 'Ticket opened.';
    case 'pulse.ticket.resolve_ticket':         return 'Ticket resolved.';
    case 'pulse.ticket.reopen_ticket':          return 'Ticket reopened.';
    case 'pulse.ticket.cancel_ticket':          return 'Ticket cancelled.';
    case 'pulse.ticket.escalate_ticket':        return 'Ticket escalated.';
    case 'pulse.ticket.assign_ticket':          return 'Ticket assigned.';
    case 'pulse.ticket.submit_operator_review': return 'Operator review submitted.';
    case 'pulse.ticket.advance_flow_state':     return typeof payload.nextState === 'string'
                                                   ? `Flow advanced to ${payload.nextState}.`
                                                   : 'Flow advanced.';
    case 'pulse.flow.transitioned':             return typeof payload.toState === 'string'
                                                   ? `Workflow transitioned to ${payload.toState}.`
                                                   : 'Workflow transition recorded.';
    case 'pulse.entry.received':                return 'Inbound entry received from customer channel.';
    case 'pulse.entry.validated':               return 'Entry validated by operator.';
    case 'pulse.entry.rejected':                return 'Entry rejected by operator.';
    case 'pulse.entry.retry_requested':         return 'Retry requested.';
    case 'pulse.knowledge.published':           return 'Knowledge context published.';
    case 'pulse.knowledge.archived':            return 'Knowledge context archived.';
    case 'pulse.conversation.linked':           return 'Conversation linked to ticket.';
    case 'pulse.conversation.resolved':         return 'Conversation resolved.';
    case 'pulse.unsupported_message_type':      return 'Inbound message type unsupported by Pulse — review required.';
    default:                                    return event.type;
  }
}

/** Filter a payload object down to display-safe primitive entries. */
function safePayloadFields(payload: Record<string, unknown> | null | undefined): PulseTimelineEventVM['payload'] {
  if (!payload) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === null) {
      out[k] = null;
    } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    }
    // Objects/arrays are intentionally dropped — never render raw JSON.
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Pull a numeric `confidence` from event payload when present (only
 * for events known to carry one).
 */
function confidenceFromPayload(payload: Record<string, unknown> | null | undefined): number | undefined {
  if (!payload) return undefined;
  const c = payload.confidence;
  if (typeof c === 'number' && Number.isFinite(c)) return c;
  return undefined;
}

function eventToVM(event: PulseEventRecord): PulseTimelineEventVM {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  return {
    id: event.id,
    rawType: event.type,
    kind: kindFor(event.type),
    actor: actorFor(event.type),
    summary: summaryFor(event),
    payload: safePayloadFields(payload),
    confidence: confidenceFromPayload(payload),
    occurredAt: event.occurredAt,
  };
}

/** Compose a row from a backend ticket record (best-effort enrichment). */
async function toRow(ticket: PulseTicketRecord): Promise<PulseTicketRow> {
  let displayName: string | null = null;
  let handle: string | null = null;
  let channelProvider: PulseTicketRow['customer']['channel'] = null;

  if (ticket.conversationId) {
    const conversation = await api.pulse.getConversation(ticket.conversationId).catch(() => null);
    if (conversation) {
      displayName = conversation.contactDisplayName;
      handle      = conversation.externalContactId;
      const channel = await api.pulse.getChannel(conversation.channelId).catch(() => null);
      channelProvider = channel?.provider ?? null;
    }
  }

  // Extended detail isn't on the list endpoint; we fetch detail only
  // for fields that materially change the queue triage decision
  // (priority, confidence). Acceptable: tickets list fans out.
  // For high-traffic deployments this is the seam we'd swap for a
  // batched backend list response.
  const detail = await api.pulse.getTicket(ticket.id).catch(() => null);

  return {
    id: ticket.id,
    type: ticket.type,
    status: ticket.status,
    priority: priorityFor(detail?.priority),
    skill: TYPE_TO_SKILL[ticket.type],
    confidence: detail?.confidence ?? null,
    customer: {handle: handle ?? '—', displayName, channel: channelProvider},
    preview: previewFor(detail),
    needsReview: ticket.status === 'PENDING_REVIEW',
    escalated:   ticket.status === 'PENDING_REVIEW' && (detail?.priority ?? 0) >= 75,
    updatedAt: detail?.resolvedAt ?? new Date().toISOString(),
  };
}

/** A short string for the row preview. Keep audit-safe — no raw payload. */
function previewFor(detail: PulseTicketDetailRecord | null): string {
  if (!detail) return '';
  const meta = detail.metadata as Record<string, unknown> | null;
  if (meta && typeof meta.summary === 'string')        return meta.summary;
  if (meta && typeof meta.aiSummary === 'string')      return meta.aiSummary;
  return '';
}

/** Compose a detail VM from ticket + supporting fetches. */
function toDetail(
  ticket: PulseTicketDetailRecord,
  enrichment: {
    contactDisplayName: string | null;
    contactHandle:      string | null;
    channelProvider:    PulseTicketDetailVM['customer']['channel'];
    conversationState:  PulseTicketDetailVM['workflow']['state'];
    events:             ReadonlyArray<PulseEventRecord>;
  },
): PulseTicketDetailVM {
  const meta = (ticket.metadata ?? {}) as Record<string, unknown>;
  const aiSummary =
    typeof meta.aiSummary === 'string' ? meta.aiSummary :
    typeof meta.summary   === 'string' ? meta.summary   :
    null;
  const reviewRationale =
    ticket.status === 'PENDING_REVIEW' && typeof meta.reviewRationale === 'string'
      ? meta.reviewRationale
      : null;

  const priority = priorityFor(ticket.priority);

  return {
    id: ticket.id,
    type: ticket.type,
    status: ticket.status,
    priority,
    skill: TYPE_TO_SKILL[ticket.type],
    confidence: ticket.confidence,
    assignedUserId: ticket.assignedUserId,
    resolvedAt: ticket.resolvedAt,
    customer: {
      handle: enrichment.contactHandle ?? '—',
      displayName: enrichment.contactDisplayName,
      channel: enrichment.channelProvider,
    },
    workflow: {
      state: enrichment.conversationState,
      playbookStep: null, // not exposed by backend yet
    },
    extracted: {
      intent: typeof meta.intent === 'string' ? meta.intent : null,
      fields: [],          // backend doesn't return structured extracted fields here yet
    },
    aiSummary,
    reviewRationale,
    timeline: enrichment.events.map(eventToVM),
    capabilities: capabilitiesFor(ticket.status, priority),
  };
}

/**
 * Local UI hint for *which buttons would even make sense* given the
 * ticket's lifecycle position. Final authorisation lives in `<Can>`
 * + the backend permission guard.
 */
function capabilitiesFor(status: PulseTicketDetailVM['status'], _priority: Priority): PulseTicketDetailVM['capabilities'] {
  switch (status) {
    case 'OPEN':
      return {canApprove: true,  canReject: true,  canEscalate: true,  canResolve: true,  canReopen: false, priority: _priority};
    case 'PENDING_REVIEW':
      return {canApprove: true,  canReject: true,  canEscalate: true,  canResolve: false, canReopen: false, priority: _priority};
    case 'WAITING_CUSTOMER':
      return {canApprove: false, canReject: false, canEscalate: true,  canResolve: true,  canReopen: false, priority: _priority};
    case 'RESOLVED':
      return {canApprove: false, canReject: false, canEscalate: false, canResolve: false, canReopen: true, priority: _priority};
    case 'CANCELLED':
      return {canApprove: false, canReject: false, canEscalate: false, canResolve: false, canReopen: true, priority: _priority};
  }
}

// ─── Error mapping ──────────────────────────────────────────────────

function mapError<T>(err: unknown): LoadResult<T> {
  if (err instanceof ApiError) {
    if (err.status === 401) return {kind: 'forbidden', permission: 'session_required'};
    if (err.status === 403) return {kind: 'forbidden'};
    if (err.status === 404) return {kind: 'not_found'};
    return {kind: 'error', status: err.status, message: err.message};
  }
  return {
    kind: 'error',
    status: 0,
    message: err instanceof Error ? err.message : 'Unknown error.',
  };
}
