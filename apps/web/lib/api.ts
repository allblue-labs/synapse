const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/v1';

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)synapse_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({message: res.statusText}));
    throw new Error(error.message ?? 'Request failed');
  }

  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{accessToken: string; tenantId: string; role: string}>(
        '/auth/login',
        {method: 'POST', body: JSON.stringify({email, password})},
      ),
    register: (data: {
      email: string;
      name: string;
      password: string;
      tenantName: string;
      tenantSlug: string;
    }) =>
      request<{accessToken: string; tenantId: string; role: string}>(
        '/auth/register',
        {method: 'POST', body: JSON.stringify(data)},
      ),
  },

  users: {
    me: () => request<{id: string; email: string; name: string; role: string; tenant: {id: string; name: string}}>('/users/me'),
  },

  clinicFlow: {
    list: (params?: {status?: string; page?: number}) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.page) qs.set('page', String(params.page));
      return request<ClinicFlowListResponse>(`/clinic-flow/queue?${qs}`);
    },
    get: (id: string) => request<ClinicFlowEntry>(`/clinic-flow/queue/${id}`),
    validate: (id: string, data: {extractedData?: ClinicFlowExtractedData; scheduledAt?: string}) =>
      request<ClinicFlowEntry>(`/clinic-flow/queue/${id}/validate`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    reject: (id: string, reason?: string) =>
      request<ClinicFlowEntry>(`/clinic-flow/queue/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({reason}),
      }),
    retry: (id: string) =>
      request<ClinicFlowEntry>(`/clinic-flow/queue/${id}/retry`, {method: 'POST'}),
    errors: () => request<ClinicFlowListResponse>('/clinic-flow/errors'),
  },
};

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
