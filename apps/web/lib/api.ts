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
  'http://192.168.1.15:5000/v1';

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

// ─── Pulse ───────────────────────────────────────────────────────────

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

export interface PulseListResponse {
  data: PulseEntry[];
  total: number;
  page: number;
  pageSize: number;
}

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
    list: (params?: {status?: string; page?: number}) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.page) qs.set('page', String(params.page));
      const suffix = qs.toString() ? `?${qs}` : '';
      return request<PulseListResponse>(`/pulse/queue${suffix}`);
    },

    get: (id: string) =>
      request<PulseEntry>(`/pulse/queue/${id}`),

    validate: (
      id: string,
      data: {extractedData?: PulseExtractedData; scheduledAt?: string},
    ) =>
      request<PulseEntry>(`/pulse/queue/${id}/validate`, {
        method: 'POST',
        json: data,
      }),

    reject: (id: string, reason?: string) =>
      request<PulseEntry>(`/pulse/queue/${id}/reject`, {
        method: 'POST',
        json: {reason},
      }),

    retry: (id: string) =>
      request<PulseEntry>(`/pulse/queue/${id}/retry`, {
        method: 'POST',
      }),

    errors: () =>
      request<PulseListResponse>('/pulse/errors'),
  },
};
