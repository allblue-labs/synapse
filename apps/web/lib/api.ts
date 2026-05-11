/**
 * Synapse API client — unified for RSC and Client Components.
 *
 * Authentication is cookie-based. There is no token to plumb through:
 *   • In a Client Component / browser fetch:
 *       `credentials: 'include'` ⇒ the browser auto-attaches the
 *       HttpOnly `synapse_session` cookie to every API request.
 *   • In a Server Component / RSC fetch:
 *       The Node runtime has no cookie jar, so we read the incoming
 *       request's cookies via `next/headers` and forward them via the
 *       `Cookie` header.
 *
 * Both paths use the same `api` object below — call it from anywhere.
 *
 * Authorization-header support has been removed deliberately. If a
 * caller is tempted to inject one, that's a sign the cookie flow has
 * been bypassed; reject the change rather than re-introducing it.
 */

// RBAC types come from the shared contracts package — single source of
// truth across API and Web.
import type {
  AuthSession as AuthSessionContract,
  CurrentUser as CurrentUserContract,
  Permission,
  UserRole,
} from '@synapse/contracts';

export type {Permission, UserRole};

// ─── Configuration ────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ??
  'synapse.allblue.lab/v1';

const DEFAULT_TIMEOUT_MS = 20_000;

const isServer = typeof window === 'undefined';

// ─── Error type ───────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly payload: unknown;

  constructor(status: number, code: string, message: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }

  /** Missing or expired session cookie. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Permission denied — caller is authenticated but lacks the right role. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** Network never reached the API (DNS, offline, abort). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

// ─── Public types ─────────────────────────────────────────────────────

/**
 * Body returned by POST /auth/login | /auth/register.
 * The access token is delivered separately via the `Set-Cookie` response
 * header — never in the body.
 */
export type AuthSession = Pick<AuthSessionContract, 'user'>;
export type CurrentUser = CurrentUserContract;

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
  tenantName: string;
  tenantSlug: string;
}

// ─── Pulse — record shapes mirror backend Prisma records ─────────────
//
// `data: …` arrays + pagination fields match the
// `IPulseTicketRepository.list` shape and the analogous channels /
// conversations / events / timeline list endpoints.

export interface Paginated<T> {
  data: ReadonlyArray<T>;
  total: number;
  page: number;
  pageSize: number;
}

export type PulseChannelProvider = 'WHATSAPP' | 'TELEGRAM';
export type PulseChannelStatus =
  | 'ACTIVE'
  | 'DISCONNECTED'
  | 'NEEDS_ATTENTION'
  | 'DISABLED';
export type PulseConversationState =
  | 'NEW'
  | 'IN_FLOW'
  | 'WAITING_CUSTOMER'
  | 'WAITING_OPERATOR'
  | 'RESOLVED'
  | 'CANCELLED';
export type PulseOperationalStatus =
  | 'ACTIVE'
  | 'NEEDS_REVIEW'
  | 'ESCALATED'
  | 'CLOSED';
export type PulseTicketType =
  | 'SUPPORT'
  | 'SALES'
  | 'SCHEDULING'
  | 'MARKETING'
  | 'OPERATOR_REVIEW'
  | 'KNOWLEDGE_REQUEST';
export type PulseTicketStatus =
  | 'OPEN'
  | 'PENDING_REVIEW'
  | 'WAITING_CUSTOMER'
  | 'RESOLVED'
  | 'CANCELLED';
export type PulseTimelineCategory =
  | 'entry'
  | 'ticket_lifecycle'
  | 'operator_action'
  | 'escalation'
  | 'confidence'
  | 'workflow_state';

export interface PulseChannelRecord {
  id: string;
  tenantId: string;
  provider: PulseChannelProvider;
  status: PulseChannelStatus;
  displayName: string;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PulseConversationRecord {
  id: string;
  tenantId: string;
  channelId: string;
  externalContactId: string;
  contactDisplayName: string | null;
  state: PulseConversationState;
  operationalStatus: PulseOperationalStatus;
  startedAt: string;
  lastEventAt: string | null;
  closedAt: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface PulseTicketRecord {
  id: string;
  tenantId: string;
  conversationId: string | null;
  type: PulseTicketType;
  status: PulseTicketStatus;
}

export interface PulseTicketDetailRecord extends PulseTicketRecord {
  assignedUserId: string | null;
  confidence: number | null;
  metadata: Record<string, unknown> | null;
  priority: number;
  resolvedAt: string | null;
}

export interface PulseEventRecord {
  id: string;
  tenantId: string;
  conversationId: string | null;
  ticketId: string | null;
  type: string;
  occurredAt: string;
  payload: Record<string, unknown> | null;
}

// ─── Knowledge contexts ──────────────────────────────────────────────

export type PulseKnowledgeContextType =
  | 'FAQ'
  | 'BUSINESS_DESCRIPTION'
  | 'OPERATIONAL_INSTRUCTION'
  | 'PRODUCT_SERVICE'
  | 'CAMPAIGN_PROMOTION';

export type PulseKnowledgeContextStatus = 'ACTIVE' | 'ARCHIVED';

export interface PulseKnowledgeContextRecord {
  id: string;
  tenantId: string;
  type: PulseKnowledgeContextType;
  status: PulseKnowledgeContextStatus;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  publishedAt: string;
  archivedAt: string | null;
}

// ─── Scheduling integrations ─────────────────────────────────────────

export type IntegrationProvider = 'GOOGLE_CALENDAR' | 'OUTLOOK_CALENDAR' | 'CALENDLY';
export type IntegrationStatus = 'ACTIVE' | 'DISCONNECTED' | 'NEEDS_ATTENTION' | 'DISABLED';

export interface PulseSchedulingIntegrationRecord {
  id: string;
  tenantId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  displayName: string;
  externalAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Lifecycle commands — request bodies ─────────────────────────────

export interface AssignTicketBody    {assignedUserId: string; note?: string}
export interface ResolveTicketBody   {resolutionSummary?: string}
export interface ReopenTicketBody    {reason?: string}
export interface EscalateTicketBody  {reason?: string; priority?: number}
export interface CancelTicketBody    {reason?: string}

export interface SubmitOperatorReviewBody {
  /** Operator-facing summary of the review outcome. */
  summary?: string;
  /** Optional confidence override the operator wants to record. */
  confidence?: number;
  /** Structured decision payload — at minimum `{approved: boolean}`. */
  decision: {
    approved: boolean;
  } & Record<string, unknown>;
}

/**
 * Flow advance — see `PULSE_FLOW_STATES` for valid `nextState` values.
 * `transitionSource` is `'manual' | 'system'` (operator vs automated).
 */
export interface AdvanceFlowStateBody {
  nextState: PulseFlowState;
  transitionSource?: 'manual' | 'system';
  confidence?: number;
  note?: string;
  aiDecisionSummary?: {
    summary: string;
    [key: string]: unknown;
  };
}

/** Pulse FSM positions — must match backend `PULSE_FLOW_STATE_VALUES`. */
export const PULSE_FLOW_STATES = [
  'intake',
  'classify_intent',
  'collect_context',
  'waiting_customer',
  'execute_action',
  'review_required',
  'operator_takeover',
  'escalated',
  'completed',
  'cancelled',
] as const;

export type PulseFlowState = typeof PULSE_FLOW_STATES[number];

// ─── List filters ────────────────────────────────────────────────────

export interface PulsePagination {
  page?: number;
  pageSize?: number;
}

export interface PulseChannelListParams extends PulsePagination {
  provider?: PulseChannelProvider;
  status?: PulseChannelStatus;
}

export interface PulseConversationListParams extends PulsePagination {
  state?: PulseConversationState;
  operationalStatus?: PulseOperationalStatus;
}

export interface PulseTicketListParams extends PulsePagination {
  type?: PulseTicketType;
  status?: PulseTicketStatus;
}

export interface PulseEventListParams extends PulsePagination {
  /** Backend filter param name is `eventType`, not `type`. */
  eventType?: string;
  category?: PulseTimelineCategory;
  occurredFrom?: string;
  occurredTo?: string;
}

export interface PulseTimelineListParams extends PulsePagination {
  category?: PulseTimelineCategory;
  occurredFrom?: string;
  occurredTo?: string;
}

// ─── Legacy queue (still backed by the original entries flow) ────────

export type PulseEntryStatus =
  | 'processing'
  | 'pending_validation'
  | 'ready_to_confirm'
  | 'scheduled'
  | 'failed';

export interface PulseExtractedData {
  procedure?: string;
  date?: string;
  time?: string;
  notes?: string;
  patientName?: string;
}

export interface PulseEntryLog {
  at: string;
  stage: string;
  message: string;
}

export interface PulseEntry {
  id: string;
  tenantId: string;
  conversationId?: string;
  status: PulseEntryStatus;
  originalMessage: string;
  transcription?: string;
  mediaUrl?: string;
  contactPhone: string;
  contactName?: string;
  extractedData?: PulseExtractedData;
  confidence?: number;
  aiSummary?: string;
  scheduledAt?: string;
  errorMessage?: string;
  processingLogs?: PulseEntryLog[];
  createdAt: string;
  updatedAt: string;
}

export type PulseListResponse = Paginated<PulseEntry>;

// ─── Internal request primitive ──────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** JSON-serialisable request body. */
  json?: unknown;
  /** Override the default 20s timeout. `0` disables it. */
  timeoutMs?: number;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {json, timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...rest} = options;

  // Forward incoming cookies on the server. On the client, the browser
  // does this for us via `credentials: 'include'` below.
  const cookieHeader = isServer ? await readServerCookieHeader() : undefined;

  // Timeout via AbortController.
  const ctrl = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(() => ctrl.abort(), timeoutMs) : null;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      signal: rest.signal ?? ctrl.signal,
      headers: {
        ...(json !== undefined ? {'Content-Type': 'application/json'} : {}),
        Accept: 'application/json',
        ...(cookieHeader ? {Cookie: cookieHeader} : {}),
        ...(headers as Record<string, string> | undefined),
      },
      body: json !== undefined ? JSON.stringify(json) : undefined,
      // Browser only — RSC fetches don't have a cookie jar to gate.
      credentials: isServer ? undefined : 'include',
      // RSC: opt out of Next's default fetch caching for authenticated
      // calls. Per-call config can override.
      cache: rest.cache ?? 'no-store',
    });
  } catch (err) {
    if (timer) clearTimeout(timer);
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    throw new ApiError(
      0,
      aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
      aborted ? 'Request timed out.' : 'Network error — could not reach the server.',
      err,
    );
  } finally {
    if (timer) clearTimeout(timer);
  }

  // 204 / 205 — no body.
  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  const text = await res.text();
  const body = text ? safeParseJson(text) : null;

  if (!res.ok) {
    if (res.status === 401 && !isServer) {
      // Client-side: redirect to login with a `next` hint. Server-side
      // 401s bubble — the caller (e.g. the dashboard layout) decides
      // whether to redirect, render an error UI, or retry.
      const here = window.location.pathname + window.location.search;
      const next = encodeURIComponent(here);
      window.location.href = `/login?next=${next}`;
    }
    throw new ApiError(
      res.status,
      pickString(body, ['code', 'error']) ?? `HTTP_${res.status}`,
      pickString(body, ['message', 'error']) ?? res.statusText ?? 'Request failed',
      body,
    );
  }

  return body as T;
}

/**
 * Read every cookie from the incoming RSC request and serialise it
 * into a `Cookie:` header value. Lazy-imports `next/headers` so this
 * module stays usable from Client Components.
 */
async function readServerCookieHeader(): Promise<string | undefined> {
  const {cookies} = await import('next/headers');
  const store = await cookies();
  const all = store.getAll();
  if (all.length === 0) return undefined;
  return all.map((c) => `${c.name}=${c.value}`).join('; ');
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Build a `?key=value&...` suffix from an object of optional params.
 * Skips entries whose value is `undefined`, `null`, or `''`. Numbers
 * are coerced to strings; everything else is passed through `String()`.
 *
 * Returns `''` when no params survive — so callers can always do
 * `` `/path${qs(params)}` `` without checking.
 */
function qs(params?: object): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const out = search.toString();
  return out ? `?${out}` : '';
}

function pickString(obj: unknown, keys: readonly string[]): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const record = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = record[k];
    if (typeof v === 'string') return v;
    if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  }
  return undefined;
}

// ─── Public surface ──────────────────────────────────────────────────

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<AuthSession>('/auth/login', {
        method: 'POST',
        json: {email, password},
      }),

    register: (data: RegisterPayload) =>
      request<AuthSession>('/auth/register', {
        method: 'POST',
        json: data,
      }),

    logout: () =>
      request<void>('/auth/logout', {method: 'POST'}),
  },

  users: {
    me: () => request<CurrentUser>('/users/me'),
  },

  pulse: {
    // ─── Channels ──────────────────────────────────────────────────
    listChannels: (params?: PulseChannelListParams) =>
      request<Paginated<PulseChannelRecord>>(`/pulse/channels${qs(params)}`),
    getChannel: (id: string) =>
      request<PulseChannelRecord>(`/pulse/channels/${id}`),

    // ─── Conversations ─────────────────────────────────────────────
    listConversations: (params?: PulseConversationListParams) =>
      request<Paginated<PulseConversationRecord>>(`/pulse/conversations${qs(params)}`),
    getConversation: (id: string) =>
      request<PulseConversationRecord>(`/pulse/conversations/${id}`),
    listConversationEvents: (id: string, params?: PulseEventListParams) =>
      request<Paginated<PulseEventRecord>>(`/pulse/conversations/${id}/events${qs(params)}`),
    listConversationTimeline: (id: string, params?: PulseTimelineListParams) =>
      request<Paginated<PulseEventRecord>>(`/pulse/conversations/${id}/timeline${qs(params)}`),

    // ─── Tickets ───────────────────────────────────────────────────
    listTickets: (params?: PulseTicketListParams) =>
      request<Paginated<PulseTicketRecord>>(`/pulse/tickets${qs(params)}`),
    getTicket: (id: string) =>
      request<PulseTicketDetailRecord>(`/pulse/tickets/${id}`),
    listTicketEvents: (id: string, params?: PulseEventListParams) =>
      request<Paginated<PulseEventRecord>>(`/pulse/tickets/${id}/events${qs(params)}`),
    listTicketTimeline: (id: string, params?: PulseTimelineListParams) =>
      request<Paginated<PulseEventRecord>>(`/pulse/tickets/${id}/timeline${qs(params)}`),

    // ─── Ticket lifecycle commands ─────────────────────────────────
    assignTicket: (id: string, body: AssignTicketBody) =>
      request<PulseTicketDetailRecord>(`/pulse/tickets/${id}/assign`, {method: 'POST', json: body}),
    resolveTicket: (id: string, body?: ResolveTicketBody) =>
      request<PulseTicketDetailRecord>(`/pulse/tickets/${id}/resolve`, {method: 'POST', json: body ?? {}}),
    reopenTicket: (id: string, body?: ReopenTicketBody) =>
      request<PulseTicketDetailRecord>(`/pulse/tickets/${id}/reopen`, {method: 'POST', json: body ?? {}}),
    escalateTicket: (id: string, body?: EscalateTicketBody) =>
      request<PulseTicketDetailRecord>(`/pulse/tickets/${id}/escalate`, {method: 'POST', json: body ?? {}}),
    cancelTicket: (id: string, body?: CancelTicketBody) =>
      request<PulseTicketDetailRecord>(`/pulse/tickets/${id}/cancel`, {method: 'POST', json: body ?? {}}),
    submitOperatorReview: (id: string, body: SubmitOperatorReviewBody) =>
      request<PulseTicketDetailRecord>(`/pulse/tickets/${id}/operator-review`, {method: 'POST', json: body}),
    advanceFlowState: (id: string, body: AdvanceFlowStateBody) =>
      request<PulseTicketDetailRecord>(`/pulse/tickets/${id}/flow/advance`, {method: 'POST', json: body}),

    // ─── Knowledge ─────────────────────────────────────────────────
    listKnowledge: (params?: PulsePagination & {type?: PulseKnowledgeContextType; status?: PulseKnowledgeContextStatus}) =>
      request<Paginated<PulseKnowledgeContextRecord>>(`/pulse/knowledge${qs(params)}`),
    getKnowledge: (id: string) =>
      request<PulseKnowledgeContextRecord>(`/pulse/knowledge/${id}`),
    queryKnowledge: (body: {query: string; type?: PulseKnowledgeContextType; limit?: number}) =>
      request<{matches: ReadonlyArray<PulseKnowledgeContextRecord>}>(`/pulse/knowledge/query`, {
        method: 'POST',
        json: body,
      }),
    publishKnowledge: (body: {
      type: PulseKnowledgeContextType;
      title: string;
      /** Note: backend field name is `content` (not `body`). */
      content: string;
      metadata?: Record<string, unknown>;
    }) =>
      request<PulseKnowledgeContextRecord>(`/pulse/knowledge`, {method: 'POST', json: body}),
    archiveKnowledge: (id: string) =>
      request<PulseKnowledgeContextRecord>(`/pulse/knowledge/${id}/archive`, {method: 'POST'}),

    // ─── Scheduling integrations (read + prepare) ──────────────────
    listSchedulingIntegrations: (params?: PulsePagination) =>
      request<Paginated<PulseSchedulingIntegrationRecord>>(`/pulse/integrations/scheduling${qs(params)}`),
    getSchedulingIntegration: (id: string) =>
      request<PulseSchedulingIntegrationRecord>(`/pulse/integrations/scheduling/${id}`),
    prepareSchedulingAvailability: (body: Record<string, unknown>) =>
      request<unknown>(`/pulse/scheduling/availability/prepare`, {method: 'POST', json: body}),
    prepareSchedulingBooking: (body: Record<string, unknown>) =>
      request<unknown>(`/pulse/scheduling/bookings/prepare`, {method: 'POST', json: body}),

    // ─── Legacy queue (entries) — kept while the operational ticket
    // surfaces stabilise. Remove once tickets fully replace queue UX. ──
    listEntries: (params?: {status?: string; page?: number; pageSize?: number}) =>
      request<PulseListResponse>(`/pulse/queue${qs(params)}`),
    getEntry: (id: string) =>
      request<PulseEntry>(`/pulse/queue/${id}`),
    validateEntry: (id: string, data: {extractedData?: PulseExtractedData; scheduledAt?: string}) =>
      request<PulseEntry>(`/pulse/queue/${id}/validate`, {method: 'POST', json: data}),
    rejectEntry: (id: string, reason?: string) =>
      request<PulseEntry>(`/pulse/queue/${id}/reject`, {method: 'POST', json: {reason}}),
    retryEntry: (id: string) =>
      request<PulseEntry>(`/pulse/queue/${id}/retry`, {method: 'POST'}),
    listEntryErrors: () =>
      request<PulseListResponse>(`/pulse/errors`),
  },
};
