/**
 * Synapse API client — production-grade fetch wrapper.
 *
 * Features:
 *   - Typed requests + responses, never returns `any`
 *   - Centralised error normalisation via `ApiError` (status + code + message)
 *   - Bearer token auto-injection from the auth cookie (client side)
 *   - 401 auto-handling: clears the stale token and redirects to /login
 *   - Network/timeout errors converted to ApiError(0, 'NETWORK_ERROR', ...)
 *   - SSR-safe: works on the server when given an explicit token
 *
 * Server components can call:
 *   await api.users.me({token: <token from cookies()>})
 *
 * Client components call without the override.
 */

import {clearToken, getToken} from './auth';

// ─────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ??
  'http://localhost:5000/v1';

const DEFAULT_TIMEOUT_MS = 20_000;

// ─────────────────────────────────────────────────────────────────────
// Error
// ─────────────────────────────────────────────────────────────────────

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

  /** True when the failure is caused by a missing/expired session. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** True when the network never reached the API (DNS, offline, abort). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Internal request primitive
// ─────────────────────────────────────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Pass any JSON-serialisable value; the wrapper handles `JSON.stringify`. */
  json?: unknown;
  /** Override the bearer token (used in Server Components). */
  token?: string | null;
  /** Skip the auth header entirely (login/register endpoints). */
  skipAuth?: boolean;
  /** Override the default 20s timeout. Pass `0` to disable. */
  timeoutMs?: number;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {json, token, skipAuth, timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...rest} = options;

  // Resolve auth header: explicit token > cookie token > none
  let authHeader: Record<string, string> = {};
  if (!skipAuth) {
    const resolved = token !== undefined ? token : getToken();
    if (resolved) authHeader = {Authorization: `Bearer ${resolved}`};
  }

  // Timeout via AbortController
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
        ...authHeader,
        ...(headers as Record<string, string> | undefined),
      },
      body: json !== undefined ? JSON.stringify(json) : undefined,
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

  // 204 / 205: no content
  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  const text = await res.text();
  const body = text ? safeParseJson(text) : null;

  if (!res.ok) {
    // Centralised 401 handling — clear token + redirect (client side only).
    if (res.status === 401 && typeof window !== 'undefined' && !skipAuth) {
      clearToken();
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

// ─────────────────────────────────────────────────────────────────────
// Typed surface
// ─────────────────────────────────────────────────────────────────────

// RBAC types come from the shared contracts package — single source of truth
// across API and Web. Re-exported here for consumer ergonomics.
import type {
  AuthSession as AuthSessionContract,
  CurrentUser as CurrentUserContract,
  Permission,
  UserRole,
} from '@synapse/contracts';

export type {Permission, UserRole};

/** Shape returned by POST /auth/login and /auth/register. */
export type AuthSession = AuthSessionContract;

/** Shape returned by GET /users/me. */
export type CurrentUser = CurrentUserContract;

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
  tenantName: string;
  tenantSlug: string;
}

// ─── ClinicFlow ─────────────────────────────────────────────────────

export type ClinicFlowStatus =
  | 'processing'
  | 'pending_validation'
  | 'ready_to_confirm'
  | 'scheduled'
  | 'failed';

export interface ClinicFlowExtractedData {
  procedure?: string;
  date?: string;
  time?: string;
  notes?: string;
  patientName?: string;
}

export interface ClinicFlowLog {
  at: string;
  stage: string;
  message: string;
}

export interface ClinicFlowEntry {
  id: string;
  tenantId: string;
  conversationId?: string;
  status: ClinicFlowStatus;
  originalMessage: string;
  transcription?: string;
  mediaUrl?: string;
  contactPhone: string;
  contactName?: string;
  extractedData?: ClinicFlowExtractedData;
  confidence?: number;
  aiSummary?: string;
  scheduledAt?: string;
  errorMessage?: string;
  processingLogs?: ClinicFlowLog[];
  createdAt: string;
  updatedAt: string;
}

export interface ClinicFlowListResponse {
  data: ClinicFlowEntry[];
  total: number;
  page: number;
  pageSize: number;
}

interface AuthOpts {
  token?: string | null;
}

// ─────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<AuthSession>('/auth/login', {
        method: 'POST',
        json: {email, password},
        skipAuth: true,
      }),

    register: (data: RegisterPayload) =>
      request<AuthSession>('/auth/register', {
        method: 'POST',
        json: data,
        skipAuth: true,
      }),
  },

  users: {
    me: (opts?: AuthOpts) => request<CurrentUser>('/users/me', {token: opts?.token}),
  },

  clinicFlow: {
    list: (params?: {status?: string; page?: number}, opts?: AuthOpts) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.page) qs.set('page', String(params.page));
      const suffix = qs.toString() ? `?${qs}` : '';
      return request<ClinicFlowListResponse>(`/clinic-flow/queue${suffix}`, {token: opts?.token});
    },

    get: (id: string, opts?: AuthOpts) =>
      request<ClinicFlowEntry>(`/clinic-flow/queue/${id}`, {token: opts?.token}),

    validate: (
      id: string,
      data: {extractedData?: ClinicFlowExtractedData; scheduledAt?: string},
      opts?: AuthOpts,
    ) =>
      request<ClinicFlowEntry>(`/clinic-flow/queue/${id}/validate`, {
        method: 'POST',
        json: data,
        token: opts?.token,
      }),

    reject: (id: string, reason?: string, opts?: AuthOpts) =>
      request<ClinicFlowEntry>(`/clinic-flow/queue/${id}/reject`, {
        method: 'POST',
        json: {reason},
        token: opts?.token,
      }),

    retry: (id: string, opts?: AuthOpts) =>
      request<ClinicFlowEntry>(`/clinic-flow/queue/${id}/retry`, {
        method: 'POST',
        token: opts?.token,
      }),

    errors: (opts?: AuthOpts) =>
      request<ClinicFlowListResponse>('/clinic-flow/errors', {token: opts?.token}),
  },
};
