export interface DocItem {
  id: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  badge?: string;
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  apiPath?: string;
  content: {
    intro: string;
    callout?: {
      type: 'note' | 'tip' | 'warning' | 'security';
      title: string;
      text: string;
    };
    codeSnippets?: {
      curl?: string;
      node?: string;
      python?: string;
      go?: string;
    };
    parameters?: {
      name: string;
      type: string;
      required: boolean;
      description: string;
    }[];
    responsePreview?: {
      status: number;
      body: string;
    };
    sections?: {
      title: string;
      body: string;
      steps?: string[];
    }[];
    relatedDocs?: {
      title: string;
      id: string;
      desc: string;
    }[];
  };
}

export interface DocCategory {
  title: string;
  items: {
    id: string;
    title: string;
    badge?: string;
    apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    apiPath?: string;
    subItems?: { id: string; title: string }[];
  }[];
}

export const DOCS_NAVIGATION: DocCategory[] = [
  {
    title: 'GET STARTED',
    items: [
      { id: 'introduction', title: 'Introduction' },
      { id: 'how-zyvan-works', title: 'How Zyvan Works' },
      { id: 'quickstart', title: 'Quickstart', badge: '5 min' },
      {
        id: 'concepts',
        title: 'Concepts',
        subItems: [
          { id: 'concepts-projects', title: 'Projects' },
          { id: 'concepts-tenants', title: 'Tenants' },
          { id: 'concepts-events', title: 'Events' },
          { id: 'concepts-destinations', title: 'Destinations' },
          { id: 'concepts-deliveries', title: 'Deliveries' },
          { id: 'concepts-attempts', title: 'Attempts' },
        ],
      },
    ],
  },
  {
    title: 'GUIDES',
    items: [
      { id: 'guide-send-first-event', title: 'Send Your First Event' },
      { id: 'guide-configure-destination', title: 'Configure a Destination' },
      { id: 'guide-verify-signatures', title: 'Verify Webhook Signatures' },
      { id: 'guide-handle-retries', title: 'Handle Retries' },
      { id: 'guide-handle-idempotency', title: 'Handle Idempotency' },
      { id: 'guide-replay-failed-events', title: 'Replay Failed Events' },
      { id: 'guide-debug-failed-deliveries', title: 'Debug Failed Deliveries' },
      { id: 'guide-multi-tenant-apps', title: 'Multi-Tenant Applications' },
    ],
  },
  {
    title: 'WEBHOOKS',
    items: [
      { id: 'webhooks-lifecycle', title: 'Webhook Lifecycle' },
      { id: 'webhooks-signing', title: 'Signing' },
      { id: 'webhooks-retry-policy', title: 'Retry Policy' },
      { id: 'webhooks-delivery-guarantees', title: 'Delivery Guarantees' },
      { id: 'webhooks-timeouts', title: 'Timeouts' },
      { id: 'webhooks-failure-handling', title: 'Failure Handling' },
    ],
  },
  {
    title: 'API REFERENCE',
    items: [
      { id: 'api-authentication', title: 'Authentication' },
      { id: 'api-projects', title: 'Projects', apiMethod: 'POST', apiPath: '/v1/projects' },
      { id: 'api-tenants', title: 'Tenants', apiMethod: 'POST', apiPath: '/v1/tenants' },
      { id: 'api-destinations', title: 'Destinations', apiMethod: 'POST', apiPath: '/v1/destinations' },
      { id: 'api-events', title: 'Events', apiMethod: 'POST', apiPath: '/v1/events' },
      { id: 'api-deliveries', title: 'Deliveries', apiMethod: 'GET', apiPath: '/v1/deliveries' },
      { id: 'api-dead-letters', title: 'Dead Letters', apiMethod: 'GET', apiPath: '/v1/dead-letters' },
      { id: 'api-replays', title: 'Replays', apiMethod: 'POST', apiPath: '/v1/events/:id/replay' },
      { id: 'api-usage', title: 'Usage', apiMethod: 'GET', apiPath: '/v1/usage' },
    ],
  },
  {
    title: 'CONCEPTS',
    items: [
      { id: 'concept-architecture', title: 'Architecture' },
      { id: 'concept-reliability', title: 'Reliability' },
      { id: 'concept-idempotency', title: 'Idempotency' },
      { id: 'concept-retry-engine', title: 'Retry Engine' },
      { id: 'concept-dead-letter-queue', title: 'Dead Letter Queue' },
      { id: 'concept-multi-tenant-isolation', title: 'Multi-Tenant Isolation' },
      { id: 'concept-security', title: 'Security' },
    ],
  },
  {
    title: 'SDKs',
    items: [
      { id: 'sdk-nodejs', title: 'Node.js' },
      { id: 'sdk-python', title: 'Python' },
      { id: 'sdk-go', title: 'Go' },
      { id: 'sdk-curl', title: 'cURL' },
    ],
  },
  {
    title: 'RESOURCES',
    items: [
      { id: 'resources-errors', title: 'Errors' },
      { id: 'resources-changelog', title: 'Changelog' },
      { id: 'resources-status', title: 'Status' },
    ],
  },
];

export const DOCS_DATA: Record<string, DocItem> = {
  // ==========================================
  // GET STARTED
  // ==========================================
  introduction: {
    id: 'introduction',
    title: 'Introduction to Zyvan',
    category: 'GET STARTED',
    readTime: '3 min read',
    description:
      'Zyvan is a developer-first, production-grade webhook and event delivery infrastructure engine built to guarantee at-least-once delivery with zero data loss.',
    content: {
      intro:
        'Modern software platforms rely on webhooks to trigger billing events, sync databases, send order updates, and coordinate microservices. However, DIY webhook delivery setups (like naive background cron loops or raw in-memory queues) fail when customer destinations time out, crash pods, or burn SQL databases during mass retry storms.',
      callout: {
        type: 'tip',
        title: 'The Zyvan Invariant',
        text: 'PostgreSQL is the durable system of record. Every event is committed to PostgreSQL with a composite unique constraint BEFORE queuing into RabbitMQ and returning HTTP 202 Accepted.',
      },
      sections: [
        {
          title: 'Why DIY Webhooks Fail',
          body: 'When applications attempt to deliver webhooks using basic background tasks:\n• Node / Pod Crashes drop events held in memory.\n• Destructive Overwrites erase historical attempt traces when retrying.\n• Database Polling (`SELECT * FROM jobs WHERE retry_at <= NOW()`) locks database tables and spikes CPU.\n• SSRF Vulnerabilities allow hostile endpoints to query `http://169.254.169.254` and steal cloud IAM credentials.',
        },
        {
          title: 'What Zyvan Solves',
          body: 'Zyvan provides an isolated, multi-tenant webhook gateway with sub-15ms ingestion, native AMQP delayed retries with exponential backoff & jitter, immutable attempt logs, true DNS SSRF protection, and non-destructive Dead Letter Queue (DLQ) replays.',
        },
      ],
      relatedDocs: [
        { id: 'how-zyvan-works', title: 'How Zyvan Works', desc: 'Detailed 5-stage delivery lifecycle.' },
        { id: 'quickstart', title: '5-Minute Quickstart', desc: 'Send your first webhook event now.' },
      ],
    },
  },

  'how-zyvan-works': {
    id: 'how-zyvan-works',
    title: 'How Zyvan Works',
    category: 'GET STARTED',
    readTime: '4 min read',
    description:
      'Understand the 5-stage lifecycle of an event through Zyvan: durable ingestion, asynchronous AMQP routing, delivery execution, exponential retry backoff, and DLQ recovery.',
    content: {
      intro:
        'Zyvan enforces a strict separation between durable ingestion and delivery execution. Ingestion is fast and lightweight, while delivery is resilient, isolated, and highly configurable.',
      callout: {
        type: 'note',
        title: 'Separation of Concerns',
        text: 'PostgreSQL guarantees transactional consistency and idempotency. RabbitMQ acts as the high-throughput delivery broker using message TTL and Dead-Letter Exchanges (DLX) for zero-polling delayed retries.',
      },
      sections: [
        {
          title: 'The 5 Stages of an Event',
          body: 'Every event follows a predictable, highly observable pipeline:',
          steps: [
            '1. Durable Ingestion: The client POSTs an event to /v1/events with an Idempotency-Key. Zyvan checks project/tenant limits and atomically commits the event to PostgreSQL.',
            '2. Asynchronous Queue: A lightweight message containing the event ID is pushed into the tenant-specific RabbitMQ delivery exchange. The API returns HTTP 202 Accepted in < 15ms.',
            '3. Worker Dispatch: Bounded AMQP prefetch workers pick up the delivery task, resolve destination DNS, sign the payload with HMAC-SHA256, and make the HTTP POST request.',
            '4. Adaptive Retries: If the destination returns a 5xx error or times out, the worker puts the task into a RabbitMQ TTL queue with exponential backoff and jitter. It re-enters automatically without database polling.',
            '5. DLQ & Replay: If retries are exhausted, the delivery transitions to the Dead Letter Queue. Replaying creates a new delivery record linked to the event, preserving full attempt history.',
          ],
        },
      ],
      relatedDocs: [
        { id: 'concept-architecture', title: 'Architecture Deep Dive', desc: 'Under-the-hood engine design.' },
        { id: 'webhooks-lifecycle', title: 'Webhook Lifecycle', desc: 'State transitions and headers.' },
      ],
    },
  },

  quickstart: {
    id: 'quickstart',
    title: 'Quickstart Guide',
    category: 'GET STARTED',
    readTime: '5 min read',
    badge: '5 min',
    description:
      'Get up and running with Zyvan in under 5 minutes. Create an API key, register a webhook destination, and publish your first event.',
    content: {
      intro:
        'Follow this step-by-step tutorial to integrate Zyvan into your application using cURL, Node.js, Python, or Go.',
      codeSnippets: {
        curl: `# Step 1: Ingest an event with idempotency
curl -X POST https://api.zyvan.dev/v1/events \\
  -H "Authorization: Bearer zyvan_live_e891c01b2a98f128c94e" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "invoice.paid",
    "tenant_id": "cust_tenant_9921",
    "idempotency_key": "inv_pay_882910_99182",
    "data": {
      "invoice_id": "inv_882910",
      "amount": 14900,
      "currency": "USD"
    }
  }'`,
        node: `import { Zyvan } from '@zyvan/sdk';

const zyvan = new Zyvan({
  apiKey: process.env.ZYVAN_API_KEY!,
});

// Ingest in < 15ms
const event = await zyvan.events.create({
  type: 'invoice.paid',
  tenantId: 'cust_tenant_9921',
  idempotencyKey: 'inv_pay_882910_99182',
  data: {
    invoice_id: 'inv_882910',
    amount: 14900,
    currency: 'USD',
  },
});

console.log('Event queued:', event.id);`,
        python: `import os
from zyvan import Zyvan

client = Zyvan(api_key=os.environ["ZYVAN_API_KEY"])

event = client.events.create(
    type="invoice.paid",
    tenant_id="cust_tenant_9921",
    idempotency_key="inv_pay_882910_99182",
    data={"invoice_id": "inv_882910", "amount": 14900, "currency": "USD"}
)

print(f"Queued delivery ID: {event.id}")`,
        go: `package main

import (
    "context"
    "fmt"
    "os"
    "github.com/zyvan/zyvan-go"
)

func main() {
    client := zyvan.NewClient(os.Getenv("ZYVAN_API_KEY"))
    
    event, err := client.Events.Create(context.Background(), &zyvan.CreateEventParams{
        Type:           "invoice.paid",
        TenantID:       "cust_tenant_9921",
        IdempotencyKey: "inv_pay_882910_99182",
        Data:           map[string]any{"amount": 14900, "currency": "USD"},
    })
    if err != nil {
        panic(err)
    }
    fmt.Println("Queued event:", event.ID)
}`,
      },
      responsePreview: {
        status: 202,
        body: `{
  "id": "evt_01j98fa90bc712",
  "project_id": "prj_acme_prod",
  "tenant_id": "cust_tenant_9921",
  "type": "invoice.paid",
  "idempotency_key": "inv_pay_882910_99182",
  "status": "queued",
  "duplicate": false,
  "created_at": "2026-09-02T15:20:00.182Z"
}`,
      },
      sections: [
        {
          title: 'Quickstart Steps',
          body: 'Get everything running in three simple steps:',
          steps: [
            '1. Obtain your API Key from the Zyvan Dashboard under Settings > API Keys.',
            '2. Register a Destination endpoint URL (or use Webhook.site for testing) with a signing secret.',
            '3. Dispatch the payload using the code snippet above and observe real-time delivery in your dashboard.',
          ],
        },
      ],
      relatedDocs: [
        { id: 'guide-configure-destination', title: 'Configure Destination', desc: 'Set up endpoints and signing secrets.' },
        { id: 'guide-verify-signatures', title: 'Verify Signatures', desc: 'Secure incoming webhook requests.' },
      ],
    },
  },

  // Sub-items of Concepts
  'concepts-projects': {
    id: 'concepts-projects',
    title: 'Projects',
    category: 'GET STARTED / CONCEPTS',
    readTime: '3 min read',
    description: 'Projects serve as the top-level isolation and configuration boundary in Zyvan.',
    content: {
      intro:
        'A Project in Zyvan represents an isolated environment, such as "Staging" or "Production". API keys, destinations, rate limits, and audit logs are strictly scoped to their parent project.',
      sections: [
        {
          title: 'Project Invariants',
          body: '• Scoped API Keys: An API key generated in Project A cannot query or trigger events in Project B.\n• Independent Rate Limiting: Projects maintain independent concurrency budgets to prevent staging workloads from affecting production.\n• Plan Boundaries: Storage retention and monthly event volume are tracked at the project tier.',
        },
      ],
    },
  },

  'concepts-tenants': {
    id: 'concepts-tenants',
    title: 'Tenants',
    category: 'GET STARTED / CONCEPTS',
    readTime: '3 min read',
    description: 'Tenants provide sub-project concurrency and noisy-neighbor isolation for SaaS customers.',
    content: {
      intro:
        'In a B2B SaaS application, your customers are Tenants. If Customer A sends 50,000 webhooks in 10 seconds, Zyvan ensures that Customer B’s webhooks are dispatched with zero latency starvation.',
      callout: {
        type: 'note',
        title: 'Tenant Fair Scheduling',
        text: 'Zyvan workers utilize channel-bounded AMQP consumer queues partitioned by tenant rate limits and concurrency caps.',
      },
      sections: [
        {
          title: 'Key Tenant Attributes',
          body: '• Concurrency Limit: Maximum concurrent outbound HTTP calls allowed simultaneously.\n• Rate Limit: Maximum events permitted per second (Token Bucket).\n• External ID: Your application internal identifier for the customer (e.g. `org_99281`).',
        },
      ],
    },
  },

  'concepts-events': {
    id: 'concepts-events',
    title: 'Events',
    category: 'GET STARTED / CONCEPTS',
    readTime: '3 min read',
    description: 'Events are immutable business occurrences containing payload data and idempotency keys.',
    content: {
      intro:
        'An Event represents something that happened in your system (e.g., `payment.succeeded`, `user.created`, `order.fulfilled`). Once accepted by Zyvan, an event cannot be modified.',
      sections: [
        {
          title: 'Idempotency Guarantee',
          body: 'Zyvan enforces composite idempotency via PostgreSQL UNIQUE(project_id, idempotency_key). Resending the exact same request safely returns the existing record with `"duplicate": true` without triggering duplicate webhook dispatches.',
        },
      ],
    },
  },

  'concepts-destinations': {
    id: 'concepts-destinations',
    title: 'Destinations',
    category: 'GET STARTED / CONCEPTS',
    readTime: '3 min read',
    description: 'Destinations specify where webhooks are delivered, how they are signed, and retry policies.',
    content: {
      intro:
        'A Destination holds the target HTTPS URL, custom HTTP headers, the AES-256-GCM encrypted signing secret, timeout budgets, and retry strategy.',
      sections: [
        {
          title: 'Health Status & Circuit Breaking',
          body: 'Destinations that continuously return 5xx errors or connection timeouts are tracked. Zyvan monitors failure rates to warn developers before delivery queues back up.',
        },
      ],
    },
  },

  'concepts-deliveries': {
    id: 'concepts-deliveries',
    title: 'Deliveries',
    category: 'GET STARTED / CONCEPTS',
    readTime: '3 min read',
    description: 'A Delivery represents the lifecycle of sending an event to a specific destination.',
    content: {
      intro:
        'If an event targets multiple destinations, each destination receives a unique Delivery record. If an event is replayed from the Dead Letter Queue, a new Delivery record is created to preserve attempt lineage.',
      sections: [
        {
          title: 'Delivery States',
          body: '• queued: Event persisted, awaiting worker pickup.\n• in_progress: Worker is currently making the outbound HTTP request.\n• delivered: Destination returned HTTP 2xx.\n• retrying: Transient error encountered; waiting in AMQP TTL queue.\n• dead_letter: Maximum retry attempts exhausted without success.',
        },
      ],
    },
  },

  'concepts-attempts': {
    id: 'concepts-attempts',
    title: 'Attempts',
    category: 'GET STARTED / CONCEPTS',
    readTime: '3 min read',
    description: 'Immutable records of each individual outbound HTTP request and response.',
    content: {
      intro:
        'Every time a Zyvan worker makes an HTTP call to a destination, an Attempt record is created capturing HTTP status code, request headers, response latency in milliseconds, and error traces.',
      callout: {
        type: 'security',
        title: 'Zero Overwrite Model',
        text: 'Unlike naive setups that overwrite attempts_count in place, Zyvan inserts a new Attempt row for every retry. You never lose the original error codes.',
      },
    },
  },

  // ==========================================
  // GUIDES
  // ==========================================
  'guide-send-first-event': {
    id: 'guide-send-first-event',
    title: 'Send Your First Event',
    category: 'GUIDES',
    readTime: '3 min read',
    description: 'Step-by-step instructions on formatting payloads, setting idempotency keys, and handling 202 Accepted responses.',
    content: {
      intro: 'Sending an event into Zyvan requires only an HTTP POST request to `/v1/events` with your Bearer API key.',
      codeSnippets: {
        curl: `curl -X POST https://api.zyvan.dev/v1/events \\
  -H "Authorization: Bearer zyvan_live_key_99812" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "order.completed",
    "tenant_id": "tenant_448",
    "idempotency_key": "ord_9941_complete",
    "data": {
      "order_id": "ord_9941",
      "total_cents": 8900
    }
  }'`,
      },
      sections: [
        {
          title: 'Handling the Response',
          body: 'Zyvan returns `202 Accepted` when the event is durably committed to PostgreSQL. You do not need to wait for the destination server to respond.',
        },
      ],
    },
  },

  'guide-configure-destination': {
    id: 'guide-configure-destination',
    title: 'Configure a Destination',
    category: 'GUIDES',
    readTime: '4 min read',
    description: 'How to register destination URLs, custom headers, timeout budgets, and signing secrets.',
    content: {
      intro: 'Destinations define the external webhooks where events are delivered. You can configure them via API or Dashboard.',
      codeSnippets: {
        curl: `curl -X POST https://api.zyvan.dev/v1/destinations \\
  -H "Authorization: Bearer zyvan_live_key_99812" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tenant_id": "tenant_448",
    "url": "https://example.com/api/webhooks",
    "event_types": ["invoice.paid", "order.completed"],
    "timeout_ms": 10000,
    "max_retries": 5
  }'`,
      },
    },
  },

  'guide-verify-signatures': {
    id: 'guide-verify-signatures',
    title: 'Verify Webhook Signatures',
    category: 'GUIDES',
    readTime: '5 min read',
    description: 'Verify HMAC-SHA256 signatures in Node.js, Python, and Go to prevent spoofing and replay attacks.',
    content: {
      intro: 'Every outbound request from Zyvan includes a timestamped signature header (`X-Zyvan-Signature` and `X-Zyvan-Timestamp`).',
      codeSnippets: {
        node: `import crypto from 'node:crypto';

export function verifyZyvanWebhook(
  rawPayload: string,
  signatureHeader: string,
  timestampHeader: string,
  signingSecret: string
): boolean {
  // 1. Prevent replay attacks (> 5 min tolerance)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestampHeader)) > 300) return false;

  // 2. Compute HMAC-SHA256
  const payloadToSign = \`\${timestampHeader}.\${rawPayload}\`;
  const expectedSignature = \`v1=\${crypto
    .createHmac('sha256', signingSecret)
    .update(payloadToSign)
    .digest('hex')}\`;

  // 3. Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expectedSignature)
  );
}`,
      },
      callout: {
        type: 'security',
        title: 'Always Use Raw Body',
        text: 'Make sure to pass the raw unparsed request body string to your HMAC function. Any JSON parsing or formatting change will cause signature verification to fail.',
      },
    },
  },

  'guide-handle-retries': {
    id: 'guide-handle-retries',
    title: 'Handle Retries & Jitter',
    category: 'GUIDES',
    readTime: '4 min read',
    description: 'Understand how Zyvan calculates exponential backoff and jitter without database polling.',
    content: {
      intro: 'When an endpoint fails with a transient error (e.g., 502, 503, 504, or TCP timeout), Zyvan delays the next retry using an AMQP message TTL queue.',
      sections: [
        {
          title: 'The Backoff Formula',
          body: 'Zyvan uses Full Jitter exponential backoff:\n`delay = random_between(0, min(max_delay, base_delay * (2 ^ attempt)))`\nThis prevents the "Thundering Herd" problem when destination servers recover from an outage.',
        },
      ],
    },
  },

  'guide-handle-idempotency': {
    id: 'guide-handle-idempotency',
    title: 'Handle Idempotency',
    category: 'GUIDES',
    readTime: '3 min read',
    description: 'Ensure double payments or duplicate records never happen using Idempotency-Key headers.',
    content: {
      intro: 'Network hiccups can cause clients to re-send requests. Zyvan’s PostgreSQL composite unique index ensures safe retries without double delivery.',
    },
  },

  'guide-replay-failed-events': {
    id: 'guide-replay-failed-events',
    title: 'Replay Failed Events',
    category: 'GUIDES',
    readTime: '3 min read',
    description: 'Safely recover events from the Dead Letter Queue without losing historical logs.',
    content: {
      intro: 'When a destination has resolved an incident, operators can replay individual events or bulk-replay entire DLQ batches via the Dashboard or API (`POST /v1/events/:id/replay`).',
    },
  },

  'guide-debug-failed-deliveries': {
    id: 'guide-debug-failed-deliveries',
    title: 'Debug Failed Deliveries',
    category: 'GUIDES',
    readTime: '4 min read',
    description: 'Inspect HTTP status codes, latency timelines, headers, and response payloads.',
    content: {
      intro: 'Every delivery includes an interactive Attempt Timeline in the Zyvan Dashboard showing exact DNS lookup latency, TLS negotiation times, HTTP response headers, and error bodies.',
    },
  },

  'guide-multi-tenant-apps': {
    id: 'guide-multi-tenant-apps',
    title: 'Multi-Tenant Applications',
    category: 'GUIDES',
    readTime: '4 min read',
    description: 'Design robust multi-tenant webhooks with tenant concurrency limits.',
    content: {
      intro: 'Configure tenant concurrency and rate limit tiers to protect shared delivery capacity across your entire SaaS userbase.',
    },
  },

  // ==========================================
  // WEBHOOKS
  // ==========================================
  'webhooks-lifecycle': {
    id: 'webhooks-lifecycle',
    title: 'Webhook Lifecycle',
    category: 'WEBHOOKS',
    readTime: '3 min read',
    description: 'Detailed lifecycle states and state machine transitions of a Zyvan webhook.',
    content: {
      intro: 'A delivery progresses through deterministic states: `queued` -> `in_progress` -> `delivered` (or `retrying` -> `dead_letter`).',
    },
  },

  'webhooks-signing': {
    id: 'webhooks-signing',
    title: 'Webhook Signing Protocol',
    category: 'WEBHOOKS',
    readTime: '3 min read',
    description: 'Timestamped HMAC-SHA256 signature scheme specifications.',
    content: {
      intro: 'Zyvan signs requests with `X-Zyvan-Signature: v1={hash}` and `X-Zyvan-Timestamp: {epoch}` to ensure authentic and tamper-proof delivery.',
    },
  },

  'webhooks-retry-policy': {
    id: 'webhooks-retry-policy',
    title: 'Retry Policy & Schedules',
    category: 'WEBHOOKS',
    readTime: '3 min read',
    description: 'Customizable retry attempts, initial delay, maximum backoff, and jitter.',
    content: {
      intro: 'Default schedule: Attempt 1 (immediate), Attempt 2 (4s), Attempt 3 (16s), Attempt 4 (64s), Attempt 5 (256s), then DLQ.',
    },
  },

  'webhooks-delivery-guarantees': {
    id: 'webhooks-delivery-guarantees',
    title: 'Delivery Guarantees',
    category: 'WEBHOOKS',
    readTime: '3 min read',
    description: 'At-least-once delivery semantics, durable persistence, and edge case handling.',
    content: {
      intro: 'Zyvan provides guaranteed at-least-once delivery under network partitions, worker crashes, and database failovers.',
    },
  },

  'webhooks-timeouts': {
    id: 'webhooks-timeouts',
    title: 'Timeouts & Socket Budgets',
    category: 'WEBHOOKS',
    readTime: '2 min read',
    description: 'Connection timeouts, TLS handshake timeouts, and read response limits.',
    content: {
      intro: 'Outbound HTTP calls enforce strict timeouts: 3s connect timeout, 10s read timeout (configurable per destination up to 30s).',
    },
  },

  'webhooks-failure-handling': {
    id: 'webhooks-failure-handling',
    title: 'Failure Handling & Classification',
    category: 'WEBHOOKS',
    readTime: '3 min read',
    description: 'How Zyvan classifies 4xx non-retryable vs 5xx retryable errors.',
    content: {
      intro: 'By default, 4xx responses (e.g. 400 Bad Request, 401 Unauthorized) are treated as terminal client errors, while 5xx and network drops trigger automatic retries.',
    },
  },

  // ==========================================
  // API REFERENCE
  // ==========================================
  'api-authentication': {
    id: 'api-authentication',
    title: 'Authentication',
    category: 'API REFERENCE',
    readTime: '2 min read',
    description: 'Authenticate REST API requests using Bearer tokens.',
    content: {
      intro: 'All API endpoints require a valid API key passed in the `Authorization` header:',
      codeSnippets: {
        curl: `curl -H "Authorization: Bearer zyvan_live_..." https://api.zyvan.dev/v1/projects`,
      },
    },
  },

  'api-projects': {
    id: 'api-projects',
    title: 'Projects API',
    category: 'API REFERENCE',
    readTime: '3 min read',
    apiMethod: 'POST',
    apiPath: '/v1/projects',
    description: 'Create and manage isolated project environments.',
    content: {
      intro: 'Endpoint to manage projects within your account.',
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Display name for the project.' },
        { name: 'plan', type: 'string', required: false, description: 'Tier: starter, growth, enterprise.' },
      ],
      responsePreview: {
        status: 201,
        body: `{\n  "id": "prj_9941a",\n  "name": "Production App",\n  "status": "active"\n}`,
      },
    },
  },

  'api-tenants': {
    id: 'api-tenants',
    title: 'Tenants API',
    category: 'API REFERENCE',
    readTime: '3 min read',
    apiMethod: 'POST',
    apiPath: '/v1/tenants',
    description: 'Configure multi-tenant limits and rate controls.',
    content: {
      intro: 'Create and configure tenant boundaries.',
      parameters: [
        { name: 'external_id', type: 'string', required: true, description: 'Your application customer ID.' },
        { name: 'concurrency_limit', type: 'number', required: false, description: 'Max parallel outbound requests.' },
        { name: 'rate_limit', type: 'number', required: false, description: 'Max events per second.' },
      ],
    },
  },

  'api-destinations': {
    id: 'api-destinations',
    title: 'Destinations API',
    category: 'API REFERENCE',
    readTime: '3 min read',
    apiMethod: 'POST',
    apiPath: '/v1/destinations',
    description: 'Register and update webhook destination targets.',
    content: {
      intro: 'Create destination endpoints for tenants.',
      parameters: [
        { name: 'tenant_id', type: 'string', required: true, description: 'Target tenant ID.' },
        { name: 'url', type: 'string', required: true, description: 'HTTPS webhook endpoint.' },
        { name: 'event_types', type: 'string[]', required: false, description: 'Subscribed event types.' },
      ],
    },
  },

  'api-events': {
    id: 'api-events',
    title: 'Events API',
    category: 'API REFERENCE',
    readTime: '3 min read',
    apiMethod: 'POST',
    apiPath: '/v1/events',
    description: 'Ingest events with sub-15ms persistence.',
    content: {
      intro: 'Primary ingestion endpoint for publishing webhook events.',
      parameters: [
        { name: 'type', type: 'string', required: true, description: 'Event identifier (e.g. invoice.paid).' },
        { name: 'tenant_id', type: 'string', required: true, description: 'Tenant to dispatch under.' },
        { name: 'idempotency_key', type: 'string', required: true, description: 'Unique deduplication key.' },
        { name: 'data', type: 'object', required: true, description: 'JSON event payload.' },
      ],
      responsePreview: {
        status: 202,
        body: `{\n  "id": "evt_88921a",\n  "status": "queued",\n  "duplicate": false\n}`,
      },
    },
  },

  'api-deliveries': {
    id: 'api-deliveries',
    title: 'Deliveries API',
    category: 'API REFERENCE',
    readTime: '3 min read',
    apiMethod: 'GET',
    apiPath: '/v1/deliveries',
    description: 'Query delivery status and individual attempt logs.',
    content: {
      intro: 'Inspect delivery records and historical attempt details.',
    },
  },

  'api-dead-letters': {
    id: 'api-dead-letters',
    title: 'Dead Letters API',
    category: 'API REFERENCE',
    readTime: '3 min read',
    apiMethod: 'GET',
    apiPath: '/v1/dead-letters',
    description: 'List failed deliveries that have exhausted all retries.',
    content: {
      intro: 'Query the DLQ for events needing operational investigation or replay.',
    },
  },

  'api-replays': {
    id: 'api-replays',
    title: 'Replays API',
    category: 'API REFERENCE',
    readTime: '2 min read',
    apiMethod: 'POST',
    apiPath: '/v1/events/:id/replay',
    description: 'Trigger a new delivery cycle for an event.',
    content: {
      intro: 'Replay a dead-lettered event while maintaining complete historical logs.',
    },
  },

  'api-usage': {
    id: 'api-usage',
    title: 'Usage API',
    category: 'API REFERENCE',
    readTime: '2 min read',
    apiMethod: 'GET',
    apiPath: '/v1/usage',
    description: 'Retrieve telemetry on event volumes and success rates.',
    content: {
      intro: 'Query aggregated deliverability stats and tenant metrics.',
    },
  },

  // ==========================================
  // CONCEPTS (Deep Dive)
  // ==========================================
  'concept-architecture': {
    id: 'concept-architecture',
    title: 'Architecture Deep Dive',
    category: 'CONCEPTS',
    readTime: '5 min read',
    description: 'Detailed architectural overview of PostgreSQL, RabbitMQ, and stateless worker pools.',
    content: {
      intro: 'Zyvan is built around three decoupled layers: Ingestion Gateway, RabbitMQ Messaging Core, and Resilient Outbound Workers.',
      sections: [
        {
          title: 'PostgreSQL as System of Record',
          body: 'Events are committed atomically before any AMQP message is sent. If the broker is momentarily unavailable, events remain safely persisted in PostgreSQL.',
        },
        {
          title: 'RabbitMQ Delayed Message Exchanges',
          body: 'Retries utilize AMQP dead-lettering and message TTL to eliminate all SQL polling. Workers only consume tasks when they are ready for delivery.',
        },
      ],
    },
  },

  'concept-reliability': {
    id: 'concept-reliability',
    title: 'Reliability Invariants',
    category: 'CONCEPTS',
    readTime: '4 min read',
    description: 'Zero data loss guarantees and failure-mode defenses.',
    content: {
      intro: 'Zyvan enforces strict engineering invariants to guarantee that events are never dropped during network partitions or node terminations.',
    },
  },

  'concept-idempotency': {
    id: 'concept-idempotency',
    title: 'Idempotency Architecture',
    category: 'CONCEPTS',
    readTime: '4 min read',
    description: 'Composite unique indexes and duplicate request safety.',
    content: {
      intro: 'How Zyvan handles race conditions and concurrent duplicate ingestion requests.',
    },
  },

  'concept-retry-engine': {
    id: 'concept-retry-engine',
    title: 'Retry Engine Design',
    category: 'CONCEPTS',
    readTime: '4 min read',
    description: 'Native AMQP queues vs database pollers.',
    content: {
      intro: 'A comparison between database polling loops and Zyvan’s zero-CPU AMQP message TTL architecture.',
    },
  },

  'concept-dead-letter-queue': {
    id: 'concept-dead-letter-queue',
    title: 'Dead Letter Queue (DLQ)',
    category: 'CONCEPTS',
    readTime: '3 min read',
    description: 'Audit-safe storage and recovery of exhausted deliveries.',
    content: {
      intro: 'When retries expire, deliveries enter DLQ with full diagnostic context ready for one-click recovery.',
    },
  },

  'concept-multi-tenant-isolation': {
    id: 'concept-multi-tenant-isolation',
    title: 'Multi-Tenant Isolation',
    category: 'CONCEPTS',
    readTime: '4 min read',
    description: 'Preventing noisy neighbor starvation across customer accounts.',
    content: {
      intro: 'Enforce independent channel prefetch limits and token-bucket rate limiters per tenant.',
    },
  },

  'concept-security': {
    id: 'concept-security',
    title: 'Security & SSRF Hardening',
    category: 'CONCEPTS',
    readTime: '4 min read',
    description: 'True DNS resolution SSRF defense and AES-256-GCM secret encryption.',
    content: {
      intro: 'How Zyvan validates destination URLs against private IP subnets and cloud metadata endpoints before opening TCP sockets.',
      callout: {
        type: 'security',
        title: 'SSRF Defense Guard',
        text: 'Zyvan resolves DNS records to their underlying IP addresses immediately before dialing, completely preventing DNS-rebinding attacks.',
      },
    },
  },

  // ==========================================
  // SDKs
  // ==========================================
  'sdk-nodejs': {
    id: 'sdk-nodejs',
    title: 'Node.js SDK',
    category: 'SDKs',
    readTime: '3 min read',
    description: 'TypeScript-first client for Node.js, Next.js, and Express.',
    content: {
      intro: 'Install `@zyvan/sdk` using npm, yarn, or pnpm:',
      codeSnippets: {
        node: `npm install @zyvan/sdk

import { Zyvan } from '@zyvan/sdk';

const zyvan = new Zyvan({
  apiKey: process.env.ZYVAN_API_KEY!,
});

await zyvan.events.create({
  type: 'customer.subscribed',
  tenantId: 'cust_491',
  idempotencyKey: 'sub_9912',
  data: { plan: 'growth' },
});`,
      },
    },
  },

  'sdk-python': {
    id: 'sdk-python',
    title: 'Python SDK',
    category: 'SDKs',
    readTime: '3 min read',
    description: 'Modern Python client with sync and async support.',
    content: {
      intro: 'Install `zyvan` using pip:',
      codeSnippets: {
        python: `pip install zyvan

from zyvan import Zyvan

client = Zyvan(api_key="zyvan_live_...")
event = client.events.create(
    type="payment.refunded",
    tenant_id="tenant_882",
    idempotency_key="ref_1092",
    data={"amount": 2500}
)`,
      },
    },
  },

  'sdk-go': {
    id: 'sdk-go',
    title: 'Go SDK',
    category: 'SDKs',
    readTime: '3 min read',
    description: 'High-performance Go SDK for backend microservices.',
    content: {
      intro: 'Install `zyvan-go`:',
      codeSnippets: {
        go: `go get github.com/zyvan/zyvan-go

import "github.com/zyvan/zyvan-go"

client := zyvan.NewClient(os.Getenv("ZYVAN_API_KEY"))
// Dispatch event...`,
      },
    },
  },

  'sdk-curl': {
    id: 'sdk-curl',
    title: 'cURL & Raw HTTP',
    category: 'SDKs',
    readTime: '2 min read',
    description: 'Use native HTTP client libraries without external dependencies.',
    content: {
      intro: 'Zyvan accepts standard JSON HTTP POST requests across all endpoints.',
      codeSnippets: {
        curl: `curl -X POST https://api.zyvan.dev/v1/events \\
  -H "Authorization: Bearer zyvan_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"type": "ping", "tenant_id": "t1", "idempotency_key": "k1", "data": {}}'`,
      },
    },
  },

  // ==========================================
  // RESOURCES
  // ==========================================
  'resources-errors': {
    id: 'resources-errors',
    title: 'Error Codes Glossary',
    category: 'RESOURCES',
    readTime: '3 min read',
    description: 'Comprehensive list of Zyvan error codes and remediation steps.',
    content: {
      intro: 'Standard Zyvan error responses include machine-readable codes:',
      sections: [
        {
          title: 'Common Error Codes',
          body: '• ERR_SSRF_BLOCKED: Destination URL resolved to a private/loopback or cloud metadata IP.\n• ERR_IDEMPOTENCY_CONFLICT: An event with the same idempotency key was sent with different payload data.\n• ERR_TENANT_RATE_EXCEEDED: Tenant exceeded configured events/sec rate limit.\n• ERR_DESTINATION_TIMEOUT: Destination failed to respond within configured timeout budget.',
        },
      ],
    },
  },

  'resources-changelog': {
    id: 'resources-changelog',
    title: 'Changelog',
    category: 'RESOURCES',
    readTime: '2 min read',
    description: 'Release history and updates to the Zyvan platform.',
    content: {
      intro: 'Track the evolution of Zyvan features and fixes.',
      sections: [
        {
          title: 'v0.1.0 — Production MVP Release',
          body: '• Durable PostgreSQL ingestion with sub-15ms SLA.\n• RabbitMQ TTL + Dead-Letter Exchanges for zero-polling retries.\n• Full Jitter exponential backoff scheduling.\n• Multi-tenant concurrency limits and rate controls.\n• True DNS SSRF protection against 169.254.169.254 exfiltration.\n• Zero-overwrite DLQ replay mechanics.',
        },
      ],
    },
  },

  'resources-status': {
    id: 'resources-status',
    title: 'System Status & SLA',
    category: 'RESOURCES',
    readTime: '2 min read',
    description: 'Current system availability and historical uptime.',
    content: {
      intro: 'All systems operational. Historical availability: 99.999%.',
      callout: {
        type: 'tip',
        title: 'Real-Time Status',
        text: 'Ingestion API: 100% • RabbitMQ Clusters: 100% • Delivery Workers: 100% • DLQ Replay: 100%',
      },
    },
  },
};
