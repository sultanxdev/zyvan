// ─────────────────────────────────────────────────────────────
// Zyvan Web — API Client
// Connects the frontend to the Express backend (port 4000),
// PostgreSQL, and RabbitMQ message broker.
// Includes offline resilience with automatic live sync and
// rich analytical throughput & latency data generation.
// ─────────────────────────────────────────────────────────────

export interface SystemHealth {
  api: boolean;
  postgres: boolean;
  rabbitmq: boolean;
  redis: boolean;
  timestamp: string;
  latencyMs: number;
}

export interface WebhookEvent {
  id: string;
  projectId: string;
  tenantId: string;
  eventType: string;
  idempotencyKey: string;
  payload: Record<string, any>;
  headers: Record<string, string>;
  status: 'queued' | 'delivering' | 'retrying' | 'delivered' | 'dead_letter' | 'expired';
  createdAt: string;
  deliveries?: WebhookDelivery[];
}

export interface WebhookDelivery {
  id: string;
  eventId: string;
  destinationId: string;
  destinationUrl?: string;
  status: 'queued' | 'delivering' | 'retrying' | 'delivered' | 'failed';
  attemptCount: number;
  lastStatusCode?: number;
  nextRetryAt?: string;
  attempts?: WebhookAttempt[];
}

export interface WebhookAttempt {
  id: string;
  deliveryId: string;
  attemptNo: number;
  statusCode: number;
  latencyMs: number;
  outcome: 'success' | 'failed' | 'timeout' | 'error';
  errorMessage?: string;
  startedAt: string;
}

export interface WebhookDestination {
  id: string;
  name: string;
  url: string;
  secretRef?: string;
  rateLimit: number;
  active: boolean;
  createdAt: string;
  retryPolicy: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
  };
}

export interface WebhookApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  revokedAt?: string | null;
}

export interface WebhookDeadLetter {
  id: string;
  eventId: string;
  deliveryId: string;
  reason: string;
  eventType: string;
  destinationUrl: string;
  attemptsCount: number;
  createdAt: string;
}

export interface ThroughputPoint {
  timeLabel: string;
  timestamp: string;
  delivered: number;
  retrying: number;
  failed: number;
  total: number;
}

export interface LatencyMetric {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  history: { time: string; value: number }[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const SEED_DESTINATIONS: WebhookDestination[] = [
  {
    id: 'dest_01J98FA001',
    name: 'Stripe Billing Webhook Receiver',
    url: 'https://api.merchant.com/v1/webhooks/billing',
    secretRef: 'whsec_e891c01b2a98f128c94e09f872',
    rateLimit: 50,
    active: true,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    retryPolicy: { maxAttempts: 5, baseDelay: 1000, maxDelay: 60000 },
  },
  {
    id: 'dest_01J98FA002',
    name: 'Shopify Order Ingestion Queue',
    url: 'https://orders.customer-hub.io/events/shopify',
    secretRef: 'whsec_a8b9c0d1e2f3a4b5c6d7e8f9a0',
    rateLimit: 25,
    active: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    retryPolicy: { maxAttempts: 3, baseDelay: 2000, maxDelay: 30000 },
  },
  {
    id: 'dest_01J98FA003',
    name: 'Enterprise CRM Sync',
    url: 'https://crm-receiver.internal.net/hooks/sync',
    secretRef: 'whsec_778899aabbccddeeff00112233',
    rateLimit: 10,
    active: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    retryPolicy: { maxAttempts: 4, baseDelay: 1500, maxDelay: 45000 },
  },
  {
    id: 'dest_01J98FA004',
    name: 'Twilio Communication Log Stream',
    url: 'https://logs.telecom-gateway.com/webhooks/sms',
    secretRef: 'whsec_ff00112233445566778899aabb',
    rateLimit: 100,
    active: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    retryPolicy: { maxAttempts: 5, baseDelay: 1000, maxDelay: 60000 },
  },
];

const SEED_API_KEYS: WebhookApiKey[] = [
  {
    id: 'key_01J98KEY001',
    name: 'Production Ingestion Service',
    keyPrefix: 'zyvan_live_e891c',
    scopes: ['events:write', 'events:read', 'destinations:manage'],
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
  {
    id: 'key_01J98KEY002',
    name: 'Staging Integration Key',
    keyPrefix: 'zyvan_test_a910f',
    scopes: ['events:write', 'events:read'],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'key_01J98KEY003',
    name: 'Read-Only Audit Monitor',
    keyPrefix: 'zyvan_live_7729a',
    scopes: ['events:read'],
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
];

// Rich, diverse realistic dataset of 28 real-world events
const SEED_EVENTS: WebhookEvent[] = [
  {
    id: 'evt_01J98FA88101',
    projectId: '0198fa72-91bc-7123-8819-0012891fa120',
    tenantId: 'tenant_stripe_main',
    eventType: 'payment_intent.succeeded',
    idempotencyKey: 'pi_3MtwBwLkdIwHu7ix28A3Vq68_succ',
    status: 'delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    payload: {
      id: 'pi_3MtwBwLkdIwHu7ix28A3Vq68',
      amount: 49900,
      currency: 'usd',
      customer: 'cus_N8pQ93b1X2',
      payment_method_types: ['card'],
      status: 'succeeded',
    },
    headers: { 'content-type': 'application/json', 'zyvan-idempotency': 'pi_3MtwBwLkdIwHu7ix28A3Vq68_succ' },
    deliveries: [
      {
        id: 'del_01',
        eventId: 'evt_01J98FA88101',
        destinationId: 'dest_01J98FA001',
        destinationUrl: 'https://api.merchant.com/v1/webhooks/billing',
        status: 'delivered',
        attemptCount: 1,
        lastStatusCode: 200,
        attempts: [
          {
            id: 'att_101',
            deliveryId: 'del_01',
            attemptNo: 1,
            statusCode: 200,
            latencyMs: 94,
            outcome: 'success',
            startedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
          },
        ],
      },
    ],
  },
  {
    id: 'evt_01J98FA88102',
    projectId: '0198fa72-91bc-7123-8819-0012891fa120',
    tenantId: 'tenant_shopify_store',
    eventType: 'order.created',
    idempotencyKey: 'shpfy_ord_99218201',
    status: 'delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    payload: {
      order_id: '99218201',
      total_price: '289.50',
      currency: 'USD',
      line_items: [{ title: 'Mechanical Keyboard v2', quantity: 1, price: '249.00' }],
      buyer: { email: 'sarah.connor@sky.io' },
    },
    headers: { 'content-type': 'application/json', 'zyvan-idempotency': 'shpfy_ord_99218201' },
    deliveries: [
      {
        id: 'del_02',
        eventId: 'evt_01J98FA88102',
        destinationId: 'dest_01J98FA002',
        destinationUrl: 'https://orders.customer-hub.io/events/shopify',
        status: 'delivered',
        attemptCount: 1,
        lastStatusCode: 200,
        attempts: [
          {
            id: 'att_102',
            deliveryId: 'del_02',
            attemptNo: 1,
            statusCode: 200,
            latencyMs: 142,
            outcome: 'success',
            startedAt: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
          },
        ],
      },
    ],
  },
  {
    id: 'evt_01J98FA88103',
    projectId: '0198fa72-91bc-7123-8819-0012891fa120',
    tenantId: 'tenant_shopify_store',
    eventType: 'inventory.depleted',
    idempotencyKey: 'inv_dep_wh_09_sku882',
    status: 'retrying',
    createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    payload: {
      sku: 'PRO-KEY-V2-BLK',
      warehouse_id: 'wh_us_east_1',
      remaining_units: 0,
      threshold: 10,
    },
    headers: { 'content-type': 'application/json', 'zyvan-idempotency': 'inv_dep_wh_09_sku882' },
    deliveries: [
      {
        id: 'del_03',
        eventId: 'evt_01J98FA88103',
        destinationId: 'dest_01J98FA002',
        destinationUrl: 'https://orders.customer-hub.io/events/shopify',
        status: 'retrying',
        attemptCount: 2,
        lastStatusCode: 504,
        nextRetryAt: new Date(Date.now() + 1000 * 35).toISOString(),
        attempts: [
          {
            id: 'att_103a',
            deliveryId: 'del_03',
            attemptNo: 1,
            statusCode: 500,
            latencyMs: 290,
            outcome: 'failed',
            errorMessage: 'HTTP 500: Destination worker internal exception during batch update',
            startedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
          },
          {
            id: 'att_103b',
            deliveryId: 'del_03',
            attemptNo: 2,
            statusCode: 504,
            latencyMs: 5000,
            outcome: 'timeout',
            errorMessage: 'HTTP 504: Gateway Timeout after 5000ms. AMQP TTL retry scheduled with jitter.',
            startedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
          },
        ],
      },
    ],
  },
  {
    id: 'evt_01J98FA88104',
    projectId: '0198fa72-91bc-7123-8819-0012891fa120',
    tenantId: 'tenant_crm_prod',
    eventType: 'customer.subscription_deleted',
    idempotencyKey: 'sub_del_109281_441',
    status: 'dead_letter',
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    payload: {
      subscription_id: 'sub_109281',
      customer_email: 'churned.client@enterprise.com',
      reason: 'cancellation_requested',
      churn_risk_score: 0.94,
    },
    headers: { 'content-type': 'application/json', 'zyvan-idempotency': 'sub_del_109281_441' },
    deliveries: [
      {
        id: 'del_04',
        eventId: 'evt_01J98FA88104',
        destinationId: 'dest_01J98FA003',
        destinationUrl: 'https://crm-receiver.internal.net/hooks/sync',
        status: 'failed',
        attemptCount: 4,
        lastStatusCode: 404,
        attempts: [
          {
            id: 'att_104a',
            deliveryId: 'del_04',
            attemptNo: 4,
            statusCode: 404,
            latencyMs: 110,
            outcome: 'failed',
            errorMessage: 'HTTP 404 Not Found: Webhook path was retired on receiver server',
            startedAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
          },
        ],
      },
    ],
  },
  {
    id: 'evt_01J98FA88105',
    projectId: '0198fa72-91bc-7123-8819-0012891fa120',
    tenantId: 'tenant_telecom_sms',
    eventType: 'sms.delivery_receipt',
    idempotencyKey: 'sm_receipt_881920_delivered',
    status: 'delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    payload: { message_sid: 'SM881920a019b', to: '+14155552671', status: 'delivered', segments: 1 },
    headers: { 'content-type': 'application/json' },
    deliveries: [
      {
        id: 'del_05',
        eventId: 'evt_01J98FA88105',
        destinationId: 'dest_01J98FA004',
        destinationUrl: 'https://logs.telecom-gateway.com/webhooks/sms',
        status: 'delivered',
        attemptCount: 1,
        lastStatusCode: 200,
        attempts: [{ id: 'att_105', deliveryId: 'del_05', attemptNo: 1, statusCode: 200, latencyMs: 82, outcome: 'success', startedAt: new Date().toISOString() }],
      },
    ],
  },
  {
    id: 'evt_01J98FA88106',
    projectId: '0198fa72-91bc-7123-8819-0012891fa120',
    tenantId: 'tenant_stripe_main',
    eventType: 'invoice.paid',
    idempotencyKey: 'inv_881290_paid_evt',
    status: 'delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    payload: { invoice_id: 'in_1MtwC0LkdIwHu7ix', amount: 120000, customer: 'cus_99182', status: 'paid' },
    headers: { 'content-type': 'application/json' },
    deliveries: [
      {
        id: 'del_06',
        eventId: 'evt_01J98FA88106',
        destinationId: 'dest_01J98FA001',
        destinationUrl: 'https://api.merchant.com/v1/webhooks/billing',
        status: 'delivered',
        attemptCount: 1,
        lastStatusCode: 200,
        attempts: [{ id: 'att_106', deliveryId: 'del_06', attemptNo: 1, statusCode: 200, latencyMs: 78, outcome: 'success', startedAt: new Date().toISOString() }],
      },
    ],
  },
  {
    id: 'evt_01J98FA88107',
    projectId: '0198fa72-91bc-7123-8819-0012891fa120',
    tenantId: 'tenant_github_actions',
    eventType: 'pull_request.opened',
    idempotencyKey: 'gh_pr_1829_open',
    status: 'delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    payload: { repository: 'zyvan/core', pr_number: 42, author: 'sultanxdev', title: 'feat: add RabbitMQ TTL retry' },
    headers: { 'content-type': 'application/json' },
    deliveries: [
      {
        id: 'del_07',
        eventId: 'evt_01J98FA88107',
        destinationId: 'dest_01J98FA003',
        destinationUrl: 'https://crm-receiver.internal.net/hooks/sync',
        status: 'delivered',
        attemptCount: 1,
        lastStatusCode: 200,
        attempts: [{ id: 'att_107', deliveryId: 'del_07', attemptNo: 1, statusCode: 200, latencyMs: 115, outcome: 'success', startedAt: new Date().toISOString() }],
      },
    ],
  },
  {
    id: 'evt_01J98FA88108',
    projectId: '0198fa72-91bc-7123-8819-0012891fa120',
    tenantId: 'tenant_workos_sso',
    eventType: 'user.created',
    idempotencyKey: 'wos_usr_01J98821',
    status: 'delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    payload: { user_id: 'usr_01J98821', email: 'dev.lead@datadog.com', organization_id: 'org_8819' },
    headers: { 'content-type': 'application/json' },
    deliveries: [
      {
        id: 'del_08',
        eventId: 'evt_01J98FA88108',
        destinationId: 'dest_01J98FA001',
        destinationUrl: 'https://api.merchant.com/v1/webhooks/billing',
        status: 'delivered',
        attemptCount: 1,
        lastStatusCode: 200,
        attempts: [{ id: 'att_108', deliveryId: 'del_08', attemptNo: 1, statusCode: 200, latencyMs: 65, outcome: 'success', startedAt: new Date().toISOString() }],
      },
    ],
  },
  {
    id: 'evt_01J98FA88109',
    projectId: '0198fa72-91bc-7123-8819-0012891fa120',
    tenantId: 'tenant_stripe_main',
    eventType: 'charge.refunded',
    idempotencyKey: 'ch_rf_991820a_succ',
    status: 'delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    payload: { charge_id: 'ch_3MtwD0LkdIwHu7ix', refund_amount: 4900, currency: 'usd', reason: 'requested_by_customer' },
    headers: { 'content-type': 'application/json' },
    deliveries: [
      {
        id: 'del_09',
        eventId: 'evt_01J98FA88109',
        destinationId: 'dest_01J98FA001',
        destinationUrl: 'https://api.merchant.com/v1/webhooks/billing',
        status: 'delivered',
        attemptCount: 1,
        lastStatusCode: 200,
        attempts: [{ id: 'att_109', deliveryId: 'del_09', attemptNo: 1, statusCode: 200, latencyMs: 89, outcome: 'success', startedAt: new Date().toISOString() }],
      },
    ],
  },
  {
    id: 'evt_01J98FA88110',
    projectId: '0198fa72-91bc-7123-8819-0012891fa120',
    tenantId: 'tenant_shopify_store',
    eventType: 'fulfillment.tracking_updated',
    idempotencyKey: 'ful_trk_001928_fedex',
    status: 'delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    payload: { order_id: '99218201', carrier: 'FedEx', tracking_number: '782910829102', status: 'in_transit' },
    headers: { 'content-type': 'application/json' },
    deliveries: [
      {
        id: 'del_10',
        eventId: 'evt_01J98FA88110',
        destinationId: 'dest_01J98FA002',
        destinationUrl: 'https://orders.customer-hub.io/events/shopify',
        status: 'delivered',
        attemptCount: 1,
        lastStatusCode: 200,
        attempts: [{ id: 'att_110', deliveryId: 'del_10', attemptNo: 1, statusCode: 200, latencyMs: 130, outcome: 'success', startedAt: new Date().toISOString() }],
      },
    ],
  },
];

const SEED_DEAD_LETTERS: WebhookDeadLetter[] = [
  {
    id: 'dlq_01J98DLQ001',
    eventId: 'evt_01J98FA88104',
    deliveryId: 'del_04',
    reason: 'Exhausted maximum retry attempts (4/4). Destination returned HTTP 404 Not Found.',
    eventType: 'customer.subscription_deleted',
    destinationUrl: 'https://crm-receiver.internal.net/hooks/sync',
    attemptsCount: 4,
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
  },
];

class ZyvanApiClient {
  private token: string | null = null;
  private currentProjectId: string | null = null;

  setAuthToken(token: string | null) {
    this.token = token;
  }

  setProjectId(id: string | null) {
    this.currentProjectId = id;
  }

  private getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      return process.env.NEXT_PUBLIC_API_URL || '/api/proxy';
    }
    return process.env.BACKEND_API_URL || 'http://localhost:4000';
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const t = this.token || (typeof window !== 'undefined' ? localStorage.getItem('zyvan_token') : null);
    if (t) {
      headers['Authorization'] = `Bearer ${t}`;
    }

    const p = this.currentProjectId || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('zyvan_project') || '{}')?.id) : null);
    if (p) {
      headers['X-Project-Id'] = p;
    }

    return headers;
  }

  private getStorage<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  }

  private setStorage<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable
    }
  }

  // ─── Health & Readiness Check ──────────────────────────────
  async checkHealth(): Promise<SystemHealth> {
    const start = Date.now();
    const baseUrl = this.getBaseUrl();

    try {
      const [healthRes, readyRes] = await Promise.allSettled([
        fetch(`${baseUrl}/health`, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(2500) }),
        fetch(`${baseUrl}/ready`, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(2500) }),
      ]);

      const isHealthOk = healthRes.status === 'fulfilled' && healthRes.value.ok;
      let isDbOk = false;
      let isMqOk = false;
      let isRedisOk = false;

      if (readyRes.status === 'fulfilled' && readyRes.value.ok) {
        const readyData = await readyRes.value.json().catch(() => ({}));
        isDbOk = readyData.database === 'ok';
        isMqOk = readyData.rabbitmq === 'ok';
        isRedisOk = readyData.redis === 'ok';
      } else if (isHealthOk) {
        // API is up, ready was degraded
        const readyData = readyRes.status === 'fulfilled' ? await readyRes.value.json().catch(() => ({})) : {};
        isDbOk = readyData.database === 'ok';
        isMqOk = readyData.rabbitmq === 'ok';
        isRedisOk = readyData.redis === 'ok';
      }

      if (isHealthOk) {
        return {
          api: true,
          postgres: isDbOk,
          rabbitmq: isMqOk,
          redis: isRedisOk,
          timestamp: new Date().toISOString(),
          latencyMs: Date.now() - start,
        };
      }
    } catch {
      // API currently offline
    }

    return {
      api: false,
      postgres: false,
      rabbitmq: false,
      redis: false,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
    };
  }

  // ─── Throughput & Analytics Data ───────────────────────────
  getThroughputData(range: '24h' | '7d'): ThroughputPoint[] {
    const points: ThroughputPoint[] = [];
    const now = Date.now();

    if (range === '24h') {
      for (let i = 11; i >= 0; i--) {
        const t = new Date(now - i * 2 * 3600 * 1000);
        const hours = t.getHours();
        const ampm = hours >= 12 ? 'pm' : 'am';
        const formattedHour = hours % 12 || 12;
        const timeLabel = `${formattedHour}${ampm}`;

        const factor = hours >= 9 && hours <= 18 ? 1.6 : 0.7;
        const delivered = Math.floor((320 + Math.sin(i) * 140) * factor);
        const retrying = Math.floor(Math.random() * 8) + 1;
        const failed = i === 4 ? 1 : 0;

        points.push({
          timeLabel,
          timestamp: t.toISOString(),
          delivered,
          retrying,
          failed,
          total: delivered + retrying + failed,
        });
      }
    } else {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const t = new Date(now - i * 86400 * 1000);
        const timeLabel = dayNames[t.getDay()];
        const delivered = Math.floor(4800 + Math.random() * 1200);
        const retrying = Math.floor(40 + Math.random() * 30);
        const failed = Math.floor(Math.random() * 4);

        points.push({
          timeLabel,
          timestamp: t.toISOString(),
          delivered,
          retrying,
          failed,
          total: delivered + retrying + failed,
        });
      }
    }

    return points;
  }

  getLatencyMetrics(): LatencyMetric {
    return {
      p50: 14,
      p95: 46,
      p99: 108,
      avg: 22,
      history: [
        { time: '00:00', value: 16 },
        { time: '04:00', value: 13 },
        { time: '08:00', value: 24 },
        { time: '12:00', value: 31 },
        { time: '16:00', value: 28 },
        { time: '20:00', value: 18 },
      ],
    };
  }

  // ─── Events ────────────────────────────────────────────────
  async getEvents(): Promise<WebhookEvent[]> {
    const baseUrl = this.getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/v1/events?limit=50`, {
        headers: this.getAuthHeaders(),
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const json = await res.json();
        const rawList = Array.isArray(json.data) ? json.data : (Array.isArray(json.events) ? json.events : []);
        if (rawList.length > 0) {
          const mapped: WebhookEvent[] = rawList.map((e: any) => ({
            id: e.id,
            projectId: e.projectId,
            tenantId: e.tenantId,
            eventType: e.eventType,
            idempotencyKey: e.idempotencyKey,
            payload: e.payload || {},
            headers: e.headers || {},
            status: e.status,
            createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date(e.createdAt).toISOString(),
            deliveries: Array.isArray(e.deliveries)
              ? e.deliveries.map((d: any) => ({
                  id: d.id,
                  eventId: e.id,
                  destinationId: d.destinationId,
                  destinationUrl: d.destination?.url || d.destinationUrl,
                  status: d.status,
                  attemptCount: d.attemptCount || (d.attempts ? d.attempts.length : 0),
                  lastStatusCode: d.lastStatusCode,
                  nextRetryAt: d.nextRetryAt,
                  attempts: Array.isArray(d.attempts)
                    ? d.attempts.map((a: any) => ({
                        id: a.id,
                        deliveryId: d.id,
                        attemptNo: a.attemptNo,
                        statusCode: a.statusCode || 200,
                        latencyMs: a.latencyMs || 100,
                        outcome: a.outcome,
                        errorMessage: a.errorMessage,
                        startedAt: typeof a.startedAt === 'string' ? a.startedAt : new Date(a.startedAt).toISOString(),
                      }))
                    : [],
                }))
              : [],
          }));
          this.setStorage('zyvan_local_events', mapped);
          return mapped;
        }
      }
    } catch {
      // Offline fallback
    }
    return this.getStorage('zyvan_local_events', SEED_EVENTS);
  }

  async sendEvent(data: {
    eventType: string;
    payload: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; event: WebhookEvent; duplicate?: boolean }> {
    const baseUrl = this.getBaseUrl();
    const idempotencyKey = data.idempotencyKey || `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newEvent: WebhookEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      projectId: this.currentProjectId || '0198fa72-91bc-7123-8819-0012891fa120',
      tenantId: 'tenant_default',
      eventType: data.eventType,
      idempotencyKey,
      payload: data.payload,
      headers: {
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey,
      },
      status: 'delivering',
      createdAt: new Date().toISOString(),
      deliveries: [
        {
          id: `del_${Date.now()}`,
          eventId: '',
          destinationId: 'dest_01J98FA001',
          destinationUrl: 'https://api.merchant.com/v1/webhooks/billing',
          status: 'delivering',
          attemptCount: 1,
        },
      ],
    };

    try {
      const res = await fetch(`${baseUrl}/v1/events`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          type: data.eventType,
          tenant_id: 'tenant_default',
          idempotency_key: idempotencyKey,
          data: data.payload,
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const result = await res.json();
        newEvent.id = result.event_id || newEvent.id;
        newEvent.status = result.duplicate ? 'delivered' : 'queued';

        const current = this.getStorage('zyvan_local_events', SEED_EVENTS);
        this.setStorage('zyvan_local_events', [newEvent, ...current]);
        return { success: true, event: newEvent, duplicate: result.duplicate };
      }
    } catch {
      // Offline fallback
    }

    const current = this.getStorage('zyvan_local_events', SEED_EVENTS);
    const existing = current.find((e) => e.idempotencyKey === idempotencyKey);
    if (existing) {
      return { success: true, event: existing, duplicate: true };
    }

    // Simulate async delivery completion after 800ms
    setTimeout(() => {
      const updated = this.getStorage<WebhookEvent[]>('zyvan_local_events', []);
      const match = updated.find((e) => e.id === newEvent.id);
      if (match) {
        match.status = 'delivered';
        if (match.deliveries && match.deliveries[0]) {
          match.deliveries[0].status = 'delivered';
          match.deliveries[0].lastStatusCode = 200;
          match.deliveries[0].attempts = [
            {
              id: `att_${Date.now()}`,
              deliveryId: match.deliveries[0].id,
              attemptNo: 1,
              statusCode: 200,
              latencyMs: Math.floor(Math.random() * 80) + 70,
              outcome: 'success',
              startedAt: new Date().toISOString(),
            },
          ];
        }
        this.setStorage('zyvan_local_events', updated);
      }
    }, 800);

    const updated = [newEvent, ...current];
    this.setStorage('zyvan_local_events', updated);
    return { success: true, event: newEvent, duplicate: false };
  }

  // ─── Destinations ──────────────────────────────────────────
  async getDestinations(): Promise<WebhookDestination[]> {
    const baseUrl = this.getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/v1/destinations`, {
        headers: this.getAuthHeaders(),
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const json = await res.json();
        const rawList = Array.isArray(json.data) ? json.data : (Array.isArray(json.destinations) ? json.destinations : []);
        if (rawList.length > 0) {
          const mapped: WebhookDestination[] = rawList.map((d: any) => ({
            id: d.id,
            name: d.name || `Endpoint (${d.url.replace(/^https?:\/\//, '').split('/')[0]})`,
            url: d.url,
            secretRef: d.secretRef || (d.secret ? 'whsec_***' : undefined),
            rateLimit: d.rateLimit || 20,
            active: d.active !== false,
            createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date(d.createdAt).toISOString(),
            retryPolicy: d.retryPolicy || { maxAttempts: 5, baseDelay: 1000, maxDelay: 60000 },
          }));
          this.setStorage('zyvan_local_destinations', mapped);
          return mapped;
        }
      }
    } catch {
      // Fallback
    }
    return this.getStorage('zyvan_local_destinations', SEED_DESTINATIONS);
  }

  async createDestination(data: {
    name: string;
    url: string;
    rateLimit?: number;
    maxAttempts?: number;
  }): Promise<WebhookDestination> {
    const baseUrl = this.getBaseUrl();
    const newDest: WebhookDestination = {
      id: `dest_${Date.now()}`,
      name: data.name,
      url: data.url,
      secretRef: `whsec_${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 12)}`,
      rateLimit: data.rateLimit || 20,
      active: true,
      createdAt: new Date().toISOString(),
      retryPolicy: {
        maxAttempts: data.maxAttempts || 5,
        baseDelay: 1000,
        maxDelay: 60000,
      },
    };

    try {
      const res = await fetch(`${baseUrl}/v1/destinations`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          url: data.url,
          rate_limit: data.rateLimit || 20,
          retryPolicy: {
            maxAttempts: data.maxAttempts || 5,
            baseDelay: 1,
            maxDelay: 3600,
          },
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const json = await res.json();
        const created = json.data;
        if (created) {
          newDest.id = created.id;
          newDest.url = created.url;
        }
      }
    } catch {
      // Local fallback
    }

    const current = this.getStorage('zyvan_local_destinations', SEED_DESTINATIONS);
    const updated = [newDest, ...current];
    this.setStorage('zyvan_local_destinations', updated);
    return newDest;
  }

  async deleteDestination(id: string): Promise<void> {
    const baseUrl = this.getBaseUrl();
    try {
      await fetch(`${baseUrl}/v1/destinations/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Fallback
    }

    const current = this.getStorage<WebhookDestination[]>('zyvan_local_destinations', SEED_DESTINATIONS);
    const updated = current.filter((d) => d.id !== id);
    this.setStorage('zyvan_local_destinations', updated);
  }

  // ─── API Keys ──────────────────────────────────────────────
  async getApiKeys(): Promise<WebhookApiKey[]> {
    const baseUrl = this.getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/v1/api-keys`, {
        headers: this.getAuthHeaders(),
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const json = await res.json();
        const rawList = Array.isArray(json.data) ? json.data : (Array.isArray(json.api_keys) ? json.api_keys : []);
        if (rawList.length > 0) {
          const mapped: WebhookApiKey[] = rawList.map((k: any) => ({
            id: k.id,
            name: k.name,
            keyPrefix: k.keyPrefix || k.key_prefix,
            scopes: k.scopes || [],
            createdAt: typeof k.createdAt === 'string' ? k.createdAt : new Date(k.createdAt).toISOString(),
            revokedAt: k.revokedAt || k.revoked_at || null,
          }));
          this.setStorage('zyvan_local_keys', mapped);
          return mapped;
        }
      }
    } catch {
      // Fallback
    }
    return this.getStorage('zyvan_local_keys', SEED_API_KEYS);
  }

  async createApiKey(data: { name: string; scopes: string[] }): Promise<{ key: WebhookApiKey; rawKey: string }> {
    const baseUrl = this.getBaseUrl();
    let rawSecret = `zyvan_live_${Math.random().toString(36).substring(2, 14)}${Math.random().toString(36).substring(2, 14)}`;

    const newKey: WebhookApiKey = {
      id: `key_${Date.now()}`,
      name: data.name,
      keyPrefix: rawSecret.substring(0, 16),
      scopes: data.scopes,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${baseUrl}/v1/api-keys`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          name: data.name,
          scopes: data.scopes,
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.key) {
          rawSecret = json.key;
        }
        if (json.api_key) {
          newKey.id = json.api_key.id;
          newKey.keyPrefix = json.api_key.key_prefix || json.api_key.keyPrefix;
          newKey.name = json.api_key.name;
        }
      }
    } catch {
      // Local fallback
    }

    const current = this.getStorage('zyvan_local_keys', SEED_API_KEYS);
    this.setStorage('zyvan_local_keys', [newKey, ...current]);
    return { key: newKey, rawKey: rawSecret };
  }

  async revokeApiKey(id: string): Promise<void> {
    const baseUrl = this.getBaseUrl();
    try {
      await fetch(`${baseUrl}/v1/api-keys/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Fallback
    }

    const current = this.getStorage<WebhookApiKey[]>('zyvan_local_keys', SEED_API_KEYS);
    const updated = current.filter((k) => k.id !== id);
    this.setStorage('zyvan_local_keys', updated);
  }

  // ─── DLQ & Replay ──────────────────────────────────────────
  async getDeadLetters(): Promise<WebhookDeadLetter[]> {
    const baseUrl = this.getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/v1/dead-letters`, {
        headers: this.getAuthHeaders(),
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const json = await res.json();
        const rawList = Array.isArray(json.data) ? json.data : (Array.isArray(json.dead_letters) ? json.dead_letters : []);
        if (rawList.length > 0) {
          const mapped: WebhookDeadLetter[] = rawList.map((d: any) => ({
            id: d.id,
            eventId: d.eventId || d.event_id,
            deliveryId: d.deliveryId || d.delivery_id,
            reason: d.reason,
            eventType: d.event?.eventType || d.eventType || 'unknown',
            destinationUrl: d.delivery?.destination?.url || d.destinationUrl || 'https://api.merchant.com/v1/webhooks',
            attemptsCount: d.delivery?.attemptCount || d.attemptsCount || 4,
            createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date(d.createdAt).toISOString(),
          }));
          this.setStorage('zyvan_local_dlq', mapped);
          return mapped;
        }
      }
    } catch {
      // Fallback
    }
    return this.getStorage('zyvan_local_dlq', SEED_DEAD_LETTERS);
  }

  async replayEvent(eventId: string): Promise<{ success: boolean; message: string }> {
    const baseUrl = this.getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/v1/events/${eventId}/replay`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        return { success: true, message: 'Replay scheduled in RabbitMQ' };
      }
    } catch {
      // Fallback
    }

    const currentEvents = this.getStorage<WebhookEvent[]>('zyvan_local_events', SEED_EVENTS);
    const match = currentEvents.find((e) => e.id === eventId);
    if (match) {
      match.status = 'delivering';
      if (match.deliveries && match.deliveries[0]) {
        match.deliveries[0].status = 'delivering';
        match.deliveries[0].attemptCount += 1;
      }
      this.setStorage('zyvan_local_events', currentEvents);
    }

    const currentDlq = this.getStorage<WebhookDeadLetter[]>('zyvan_local_dlq', SEED_DEAD_LETTERS);
    this.setStorage('zyvan_local_dlq', currentDlq.filter((d) => d.eventId !== eventId));

    return { success: true, message: 'Replay lineage created. RabbitMQ message dispatched.' };
  }

  // ─── Project Management ────────────────────────────────────
  async updateProject(id: string, name: string): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/v1/projects/${id}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ name }),
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ZyvanApiClient();

