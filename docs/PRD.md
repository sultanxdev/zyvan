# 📋 Zyvan — Product Requirements Document (PRD)
> **Version:** 1.0 | **Status:** Active Development | **Author:** Sultan Alam | **Date:** March 2026

---

## 1. Overview

### 1.1 Product Summary
**Zyvan** is an open-source **Distributed Webhook Reliability Middleware**. It decouples event acceptance from event delivery, guaranteeing **at-least-once delivery** of webhooks to external HTTP endpoints — even across downstream outages, network blips, or client retries.

### 1.2 The Core Mental Model
> **Acceptance is synchronous and durable. Delivery is asynchronous and recoverable.**

Once Zyvan commits an event to its database, it is responsible for that event's delivery — forever, until it either succeeds or is explicitly dead-lettered.

### 1.3 Who Is This For?
| Persona | Usage |
|---|---|
| **Backend Engineer** | Integrating Zyvan SDK/API into their SaaS to handle outgoing webhooks |
| **Platform / Infra Team** | Deploying and operating Zyvan as internal infrastructure |
| **Operator / Admin** | Managing DLQ, replaying failed events, monitoring delivery health |

---

## 2. Problem Statement

Calling external webhooks directly from API handlers is the default pattern — and it's fundamentally broken at scale:

| Problem | Root Cause | Business Impact |
|---|---|---|
| Data loss on receiver downtime | Synchronous, fire-and-forget delivery | Critical events silently dropped |
| API latency spikes | Blocking HTTP call inside request handler | Degraded user experience |
| No recovery path | No retry logic or event storage | Manual data reconciliation |
| Zero observability | No logs, no attempt history | Impossible to debug failures |
| Duplicate delivery on client retry | No idempotency enforcement | Double-processing side effects |

---

## 3. Goals

### Must Have (v1)
- ✅ Durable at-least-once event delivery
- ✅ Idempotent ingestion via `Idempotency-Key` header
- ✅ Configurable retry with exponential backoff + jitter
- ✅ Dead Letter Queue (DLQ) with full attempt history preserved
- ✅ Manual replay of DLQ events via API
- ✅ HMAC-SHA256 webhook signing on every delivery
- ✅ SSRF protection via dedicated outgoing proxy
- ✅ Full audit log for every HTTP delivery attempt
- ✅ REST API for event ingestion and management
- ✅ Developer dashboard (Next.js) for observability and DLQ management

### Should Have (v2)
- 🔲 Multi-tenant workspace isolation
- 🔲 Per-endpoint retry policy configuration
- 🔲 Alert/notification on DLQ threshold breach
- 🔲 Webhook endpoint health scoring
- 🔲 Rate limiting per API key

### Won't Have (v1)
- ❌ Exactly-once delivery guarantee
- ❌ Multi-region active-active replication
- ❌ Non-HTTP delivery (gRPC, SQS, SNS, etc.)
- ❌ Real-time streaming (SSE / WebSocket)

---

## 4. Functional Requirements

### 4.1 Authentication & API Keys
- Every API request must include a valid **API key** (`x-api-key` header or `Bearer` token)
- API keys are scoped to a **project/workspace**
- Invalid or missing keys must return `401 Unauthorized`
- API key rotation must be supported without downtime

### 4.2 Event Ingestion (`POST /v1/events`)

**Request contract:**
```http
POST /v1/events
x-api-key: <key>
Idempotency-Key: evt_abc123
Content-Type: application/json

{
  "endpoint_id": "ep_xyz",
  "event_type": "user.created",
  "payload": { ... },
  "metadata": { ... }         // optional
}
```

**Validation rules (synchronous, before DB write):**
- API key must be valid
- `endpoint_id` must exist and be active
- `Idempotency-Key` header is required
- `payload` must be valid JSON
- `payload` size must not exceed configured limit (default: 512KB)
- `event_type` must be a non-empty string

**Idempotency logic:**
```
BEGIN TRANSACTION
  SELECT * FROM events WHERE idempotency_key = :key
  IF found → ROLLBACK → return 200 OK with existing event
  ELSE → INSERT event (status=RECEIVED) → COMMIT → push to queue → return 202 Accepted
END
```

**Success response:**
```json
HTTP 202 Accepted
{
  "event_id": "evt_...",
  "status": "accepted",
  "idempotency_key": "evt_abc123"
}
```

**Error responses:**
| Code | Reason |
|---|---|
| `400` | Validation failure (missing field, bad format, oversized payload) |
| `401` | Missing or invalid API key |
| `404` | `endpoint_id` not found |
| `409` | Idempotency-Key already exists (on explicit conflict — implementation detail) |
| `500` | Internal server error |

---

### 4.3 Endpoint Management

Endpoints are the registered targets where Zyvan delivers webhooks.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Auto-generated |
| `url` | String | Target HTTPS URL |
| `signing_secret` | String | Used for HMAC signing (auto-generated, user-viewable once) |
| `max_retries` | Int | Default: 5 |
| `timeout_ms` | Int | Default: 30000ms |
| `is_active` | Boolean | Inactive endpoints reject new events |
| `created_at` | Timestamp | — |

**API routes:**
```
GET    /v1/endpoints          → List endpoints
POST   /v1/endpoints          → Register a new endpoint
GET    /v1/endpoints/:id      → Get endpoint details
PATCH  /v1/endpoints/:id      → Update config (url, retries, timeout)
DELETE /v1/endpoints/:id      → Soft delete (deactivate)
```

---

### 4.4 Event Lifecycle & States

| State | Trigger |
|---|---|
| `RECEIVED` | DB commit on ingestion |
| `DISPATCHING` | Worker picks event from queue |
| `DELIVERED` | Target returns 2xx |
| `RETRY_SCHEDULED` | Target returns 5xx or times out |
| `DEAD_LETTERED` | 4xx response OR max retries exhausted |

All state transitions must be **persisted and timestamped**.

---

### 4.5 Dispatcher Workers

- Workers are **BullMQ processors** that consume jobs from a Redis queue
- On each attempt, the worker must:
  1. Load event payload and endpoint config from PostgreSQL
  2. Build request headers including `X-Zyvan-Signature` (HMAC-SHA256)
  3. Route the request through the **Outgoing Proxy** (not direct call)
  4. Apply the configured `timeout_ms`
  5. Log the full attempt (status, latency, response headers + body) to DB
  6. Transition event state based on response

**HMAC Signature generation:**
```
signature = HMAC-SHA256(signing_secret, raw_body)
header: X-Zyvan-Signature: sha256=<hex>
```

---

### 4.6 Retry Strategy

```
delay(attempt) = base_delay_ms * (2 ^ attempt) + random(0, jitter_ms)
```

| Config Key | Default |
|---|---|
| `base_delay_ms` | 1000 (1s) |
| `max_retries` | 5 |
| `jitter_ms` | 500 |
| `max_delay_ms` | 3600000 (1 hour cap) |

- Retry is only triggered for **transient failures** (5xx, network timeout)
- **4xx errors are permanent failures** → immediate DLQ routing
- BullMQ delayed jobs handle scheduling with no worker thread blocking

---

### 4.7 Dead Letter Queue (DLQ)

When an event is dead-lettered:
- `status` → `DEAD_LETTERED`
- `failure_reason` is recorded (last HTTP status / error message)
- Full `delivery_attempts` history is preserved
- No automatic retry occurs

**DLQ management API:**
```
GET  /v1/events?status=DEAD_LETTERED    → List DLQ events
POST /v1/events/:id/replay              → Re-enqueue an event
POST /v1/events/replay/bulk             → Bulk replay (array of event IDs)
```

**Replay flow:**
1. Validate event exists and is `DEAD_LETTERED`
2. Re-validate idempotency (create new attempt, not duplicate event)
3. Push `event_id` back to queue
4. Transition state → `DISPATCHING`

---

### 4.8 Attempt Logging

Every HTTP delivery attempt must log:
| Field | Description |
|---|---|
| `event_id` | FK to events |
| `attempt_number` | 1-indexed |
| `http_status` | Response status code (null on timeout) |
| `response_body` | Truncated to 2KB |
| `response_headers` | JSONB |
| `latency_ms` | End-to-end request latency |
| `error_message` | Network error message (null on HTTP response) |
| `attempted_at` | Timestamp |

---

### 4.9 Dashboard (client/)
The Next.js dashboard must provide:
- **Event Explorer**: browse, search, filter events by status / date / endpoint
- **Attempt Viewer**: drill into any event and see full HTTP attempt history
- **DLQ Manager**: filter dead-lettered events, replay single or bulk
- **Endpoint Settings**: CRUD for endpoints, view signing secret, toggle active
- **Analytics**: delivery rate, error rate, retry distribution, P99 latency charts
- **API Key Management**: generate, list, revoke keys

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Availability** | 99.9% uptime for Ingest API |
| **Throughput** | ≥ 10,000 ingestion events/sec (horizontally scalable) |
| **Ingest Latency** | p99 < 50ms (synchronous path, excluding DB write) |
| **Delivery Latency** | Worker picks up event within 1s of enqueue under normal load |
| **Durability** | Zero event loss after DB commit |
| **Security** | Zero direct outbound HTTP from workers; all via proxy |
| **Observability** | Structured JSON logs for all requests, queue operations, delivery attempts |
| **Scalability** | Ingest API and Workers must scale independently and horizontally |

---

## 6. Data Model

### `events`
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
idempotency_key   VARCHAR(255) UNIQUE NOT NULL
endpoint_id       UUID NOT NULL REFERENCES endpoints(id)
event_type        VARCHAR(100) NOT NULL
payload           JSONB NOT NULL
metadata          JSONB
status            event_status NOT NULL DEFAULT 'RECEIVED'
failure_reason    TEXT
retry_count       INT NOT NULL DEFAULT 0
created_at        TIMESTAMPTZ DEFAULT now()
updated_at        TIMESTAMPTZ DEFAULT now()

INDEX ON (idempotency_key)
INDEX ON (status)
INDEX ON (endpoint_id, created_at DESC)
```

### `delivery_attempts`
```sql
id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
event_id         UUID NOT NULL REFERENCES events(id)
attempt_number   INT NOT NULL
http_status      INT
response_body    TEXT
response_headers JSONB
latency_ms       INT
error_message    TEXT
attempted_at     TIMESTAMPTZ DEFAULT now()
```

### `endpoints`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
url             VARCHAR(2048) NOT NULL
signing_secret  VARCHAR(255) NOT NULL
max_retries     INT NOT NULL DEFAULT 5
timeout_ms      INT NOT NULL DEFAULT 30000
is_active       BOOLEAN NOT NULL DEFAULT true
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### `api_keys`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
key_hash    VARCHAR(255) UNIQUE NOT NULL  -- bcrypt hash, never store plaintext
prefix      VARCHAR(10) NOT NULL           -- e.g. "zv_live_" for display
is_active   BOOLEAN NOT NULL DEFAULT true
created_at  TIMESTAMPTZ DEFAULT now()
last_used_at TIMESTAMPTZ
```

---

## 7. Full API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/events` | ✅ | Ingest a new event |
| `GET` | `/v1/events` | ✅ | List events (filter: status, endpoint_id, date) |
| `GET` | `/v1/events/:id` | ✅ | Get event + full attempt history |
| `POST` | `/v1/events/:id/replay` | ✅ | Replay a dead-lettered event |
| `POST` | `/v1/events/replay/bulk` | ✅ | Bulk replay event IDs |
| `GET` | `/v1/endpoints` | ✅ | List endpoints |
| `POST` | `/v1/endpoints` | ✅ | Create endpoint |
| `GET` | `/v1/endpoints/:id` | ✅ | Get endpoint |
| `PATCH` | `/v1/endpoints/:id` | ✅ | Update endpoint |
| `DELETE` | `/v1/endpoints/:id` | ✅ | Deactivate endpoint |
| `GET` | `/v1/api-keys` | ✅ | List API keys |
| `POST` | `/v1/api-keys` | ✅ | Generate new API key |
| `DELETE` | `/v1/api-keys/:id` | ✅ | Revoke API key |
| `GET` | `/v1/analytics/summary` | ✅ | Delivery rate, error rate, counts |
| `GET` | `/health` | ❌ | Liveness probe |

---

## 8. Security Requirements

| Requirement | Implementation |
|---|---|
| SSRF prevention | All worker HTTP via dedicated outgoing proxy with IP/DNS filtering |
| API key storage | Store **hashed** (bcrypt), never plaintext |
| Webhook authentication | HMAC-SHA256 `X-Zyvan-Signature` header on every delivery |
| Transport | TLS required for all inbound and outbound connections |
| Payload validation | Reject oversized, malformed, or non-JSON payloads at ingest |
| Internal IP block | Proxy must block 10.x, 192.168.x, 172.16.x, 127.x, 169.254.x |

---

## 9. Milestones

| # | Milestone | Deliverables |
|---|---|---|
| **M1** | Core Engine | Ingest API, DB schema, BullMQ workers, basic delivery |
| **M2** | Reliability | Idempotency enforcement, retry with backoff, DLQ routing |
| **M3** | Security | HMAC signing, outgoing proxy, SSRF IP/DNS filtering |
| **M4** | Observability | Attempt logging, structured logs, `/health` endpoint |
| **M5** | Dashboard | Next.js client: event browser, attempt viewer, DLQ manager, analytics |
| **M6** | Production | Docker Compose + K8s configs, load testing, horizontal scale validation |

---

## 10. Success Metrics

| Metric | Target |
|---|---|
| Event loss post-DB commit | 0% |
| Overall delivery success rate | ≥ 99.5% within retry window |
| DLQ replay success rate (post-fix) | ≥ 95% |
| Ingest API p99 latency | < 50ms |
| Worker pickup latency | < 1s under normal load |

---

*[Back to README](../README.md) | [Architecture Deep Dive](architecture.md) | [Technical Explainer](explainer.md)*
