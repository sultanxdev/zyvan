const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `API error: ${res.status}`);
  }

  return res.json();
}

// ── Types ────────────────────────────────────────────────────

export type EventStatus =
  | 'RECEIVED'
  | 'DISPATCHING'
  | 'DELIVERED'
  | 'RETRY_SCHEDULED'
  | 'DEAD_LETTERED';

export interface DeliveryAttempt {
  id: string;
  eventId: string;
  attemptNumber: number;
  httpStatus: number | null;
  responseBody: string | null;
  latencyMs: number | null;
  errorMessage: string | null;
  attemptedAt: string;
}

export interface Event {
  id: string;
  idempotencyKey: string;
  endpointId: string;
  eventType: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  status: EventStatus;
  failureReason: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  attempts?: DeliveryAttempt[];
  endpoint?: { id: string; url: string; maxRetries: number; timeoutMs: number };
  _count?: { attempts: number };
}

export interface Endpoint {
  id: string;
  url: string;
  max_retries: number;
  timeout_ms: number;
  is_active: boolean;
  event_count: number;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  prefix: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface AnalyticsSummary {
  total: number;
  delivered: number;
  dead_lettered: number;
  retrying: number;
  dispatching: number;
  pending: number;
  success_rate: string;
}

// ── API Helpers ─────────────────────────────────────────────

export const api = {
  analytics: {
    summary: () => apiFetch<AnalyticsSummary>('/v1/analytics/summary'),
  },
  events: {
    list: (params?: { status?: string; endpoint_id?: string; limit?: number; offset?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.endpoint_id) qs.set('endpoint_id', params.endpoint_id);
      if (params?.limit != null) qs.set('limit', String(params.limit));
      if (params?.offset != null) qs.set('offset', String(params.offset));
      return apiFetch<{ data: Event[]; count: number }>(`/v1/events?${qs}`);
    },
    get: (id: string) => apiFetch<Event>(`/v1/events/${id}`),
    replay: (id: string) =>
      apiFetch<{ event_id: string; status: string }>(`/v1/events/${id}/replay`, { method: 'POST' }),
    replayBulk: (event_ids: string[]) =>
      apiFetch<{ replayed: string[]; failed: string[] }>('/v1/events/replay/bulk', {
        method: 'POST',
        body: JSON.stringify({ event_ids }),
      }),
  },
  endpoints: {
    list: () => apiFetch<{ data: Endpoint[]; count: number }>('/v1/endpoints'),
    get: (id: string) => apiFetch<Endpoint>(`/v1/endpoints/${id}`),
    create: (data: { url: string; max_retries?: number; timeout_ms?: number }) =>
      apiFetch<Endpoint & { signing_secret: string }>('/v1/endpoints', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<{ url: string; max_retries: number; timeout_ms: number; is_active: boolean }>) =>
      apiFetch<Endpoint>(`/v1/endpoints/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetch(`${API_BASE}/v1/endpoints/${id}`, { method: 'DELETE', headers: { 'x-api-key': API_KEY } }),
  },
  keys: {
    list: () => apiFetch<{ data: ApiKey[]; count: number }>('/v1/api-keys'),
    create: (name?: string) =>
      apiFetch<ApiKey & { key: string }>('/v1/api-keys', { method: 'POST', body: JSON.stringify({ name }) }),
    revoke: (id: string) =>
      fetch(`${API_BASE}/v1/api-keys/${id}`, { method: 'DELETE', headers: { 'x-api-key': API_KEY } }),
  },
};
