# 🏗️ Zyvan — Pre-Build Developer Guide
> **Who is this for?** Any developer about to contribute to or build Zyvan from scratch. Read this before writing any code. Understanding these concepts will make every implementation decision obvious.

---

## Table of Contents
1. [The Core Problem You're Solving](#1-the-core-problem-youre-solving)
2. [Mental Models to Lock In](#2-mental-models-to-lock-in)
3. [Infrastructure Concepts](#3-infrastructure-concepts)
4. [Backend Engineering Concepts](#4-backend-engineering-concepts)
5. [Security Concepts](#5-security-concepts)
6. [TypeScript & Node.js Patterns](#6-typescript--nodejs-patterns)
7. [Database Design Essentials](#7-database-design-essentials)
8. [Tooling You Must Know](#8-tooling-you-must-know)
9. [Recommended Learning Order](#9-recommended-learning-order)

---

## 1. The Core Problem You're Solving

Before touching code, deeply understand **why naive webhook calls fail**:

```
❌ Naive approach (what most apps do):
   API Handler → await fetch(webhookUrl, payload)
   
   Problems:
   - If webhook server is down → data lost
   - If webhook server is slow → your API is blocked
   - If client retried → event processed twice
   - Zero logs → impossible to debug
```

```
✅ Zyvan's approach:
   API Handler → POST /v1/events (fast, sync, durable)
         ↓
   Zyvan DB Write → immediate 202 Accepted
         ↓
   Background Worker → delivers async, retries on failure
```

**Key insight:** Zyvan separates the **reliability boundary** (DB commit) from **delivery**. Once the DB write succeeds, Zyvan is responsible, not the caller.

---

## 2. Mental Models to Lock In

### 2.1 The Reliability Boundary
The moment a row is inserted into the `events` table is the **reliability boundary**. Before this — the client is responsible. After this — Zyvan is responsible. This boundary must be crystal clear in all discussions and implementation.

### 2.2 Acceptance ≠ Delivery
A `202 Accepted` response to the client means: *"we have durably stored your event."* It does **not** mean the webhook has been delivered. Delivery happens asynchronously. These are two separate concerns.

### 2.3 The Database is the Source of Truth
Redis (the queue) is **ephemeral**. If Redis crashes, jobs are lost — but that's okay because the events are in PostgreSQL. A recovery/sweep job can re-enqueue any events stuck in `RECEIVED` or `DISPATCHING` states. The queue is a convenience, not the source of truth.

### 2.4 At-Least-Once (Not Exactly-Once)
Zyvan guarantees **at-least-once** delivery. This means receivers may see the same event more than once (e.g., if a worker crashes after delivery but before marking the event as DELIVERED). Receivers should be designed to handle this idempotently using the `X-Zyvan-Event-Id` header.

---

## 3. Infrastructure Concepts

### 3.1 PostgreSQL — Source of Truth
**What to know:**
- ACID transactions (`BEGIN`, `COMMIT`, `ROLLBACK`) and why they matter for idempotency
- `UNIQUE` constraints and what happens on insert conflict
- Database indices — why `events(idempotency_key)` and `events(status)` need indices
- `JSONB` column type for flexible payload storage
- Row-level locking with `SELECT FOR UPDATE` (for concurrent worker scenarios)

**Why it matters in Zyvan:** The idempotency check uses a DB transaction to atomically check-and-insert. An index on `idempotency_key` makes this lookup O(log n) instead of a full table scan.

### 3.2 Redis — Task Queue Backing Store
**What to know:**
- Redis data structures: Lists, Sorted Sets (BullMQ uses both)
- Redis persistence modes: RDB snapshots vs AOF — understand the tradeoffs
- Pub/Sub vs Queue patterns

**Why it matters in Zyvan:** Workers consume job IDs from Redis. Delayed/retried jobs are stored in a Redis Sorted Set scored by their execute-at timestamp.

### 3.3 BullMQ — Job Queue
**What to know:**
- Queue, Worker, and Job concepts
- Job lifecycle: waiting → active → completed / failed
- `delay` option for scheduling retry jobs
- `attempts` and `backoff` options for built-in retry (Zyvan manages this manually for finer control)
- Stalled job detection and how BullMQ handles worker crashes

**Why it matters in Zyvan:** BullMQ is the nervous system. Understand how it moves jobs between states to understand how Zyvan's delivery pipeline works.

### 3.4 Docker & Docker Compose
**What to know:**
- Writing a `Dockerfile` for a Node.js app
- `docker-compose.yml` for spinning up PostgreSQL + Redis locally
- Environment variable injection
- Volume persistence for database data

**Why it matters in Zyvan:** Local dev setup uses Docker Compose. Production will use Docker images in K8s.

---

## 4. Backend Engineering Concepts

### 4.1 Idempotency
**What it means:** Performing the same operation multiple times produces the same result as doing it once.

**How Zyvan implements it:**
```
Client sends POST /v1/events with Idempotency-Key: evt_123

First call  → DB INSERT (new event) → 202 Accepted (new event_id)
Second call → DB SELECT finds existing → 200 OK (same event_id, no duplicate)
```

**Key principle:** The idempotency check and insert must happen in a single DB transaction to be safe under concurrent requests.

### 4.2 Exponential Backoff with Jitter
**What it is:** A retry timing strategy to avoid thundering herd problems.

```
delay = base * (2 ^ retryCount) + random_jitter

retry 1: 1s  + jitter
retry 2: 2s  + jitter
retry 3: 4s  + jitter
retry 4: 8s  + jitter
retry 5: 16s + jitter  → DLQ if still failing
```

**Why jitter?** Without jitter, all retrying workers fire at the same instant after an outage, overwhelming the recovering server.

### 4.3 Dead Letter Queue (DLQ)
**What it is:** A holding area for events that have permanently failed.

**Zyvan's DLQ is NOT a separate queue** — it's a status value (`DEAD_LETTERED`) on the event row. Events in DLQ are queryable, inspectable, and replayable via an API call.

### 4.4 Event-Driven Architecture vs. Request-Response
- **Request-Response:** Caller waits for the full operation to complete
- **Event-Driven:** Caller submits work, immediately gets acknowledgment, work happens later

Zyvan's ingest is request-response (fast, synchronous). Delivery is event-driven (async, decoupled). Understanding this boundary is fundamental.

### 4.5 Horizontal Scaling
**What it means:** Adding more instances of a service to handle more load, rather than upgrading a single machine.

**In Zyvan:**
- The **Ingest API** is stateless → can be scaled freely behind a load balancer
- **Workers** are stateless → multiple instances consume from the same Redis queue
- **PostgreSQL** is the shared, stateful layer — connection pooling (PgBouncer) needed at scale

---

## 5. Security Concepts

### 5.1 HMAC-SHA256 Webhook Signing
**What it is:** A cryptographic method to prove a webhook payload was sent by Zyvan and wasn't tampered with.

**How it works:**
```
signature = HMAC-SHA256(endpoint.signing_secret, raw_request_body)
header → X-Zyvan-Signature: sha256=<hex_signature>
```

**Receiver verification:**
```
expected = HMAC-SHA256(my_signing_secret, received_body)
if timingSafeEqual(expected, received_signature) → authentic
```

**Important:** Use `crypto.timingSafeEqual()` — not `===` — to prevent timing attacks.

### 5.2 SSRF (Server-Side Request Forgery)
**What it is:** An attacker registers a webhook URL pointing to an internal service (e.g., `http://169.254.169.254/metadata`), tricking your server into leaking internal data.

**How Zyvan prevents it:**
1. All outgoing HTTP is routed through a dedicated **Outgoing Proxy**
2. The proxy resolves the domain via DNS
3. If the resolved IP is a private range (`10.x`, `192.168.x`, `172.16.x`, `127.x`, `169.254.x`), the request is blocked

**Never** allow workers to call external URLs directly.

### 5.3 API Key Security
- **Never store plaintext API keys** — store a hash (SHA-256 or bcrypt)
- Show the full key only once at creation time
- Store a prefix (`zv_live_...`) for display/identification
- Validate keys using constant-time comparison

---

## 6. TypeScript & Node.js Patterns

### 6.1 TypeScript Basics Required
- Interfaces and types for request/response shapes
- Enums for event states: `EventStatus.RECEIVED`, etc.
- Generic types for typed DB query results
- `async/await` and typed Promise chains
- Zod or Joi for runtime schema validation

### 6.2 Express Patterns
- Route → Controller → Service layering (keep routes thin)
- Global error handling middleware (`app.use((err, req, res, next) => ...)`)
- Request validation middleware (validate before hitting controller)
- `async` controller wrapper to catch unhandled promise rejections

### 6.3 BullMQ Worker Pattern
```ts
const worker = new Worker('event-dispatch', async (job) => {
  const { eventId } = job.data;
  // load event, dispatch, log attempt, update status
}, { connection: redisClient });

worker.on('failed', (job, err) => {
  // handle permanent failures → DLQ
});
```

### 6.4 Environment Configuration
- Use `dotenv` or similar for local env vars
- Never hardcode secrets — all config comes from `.env`
- Validate required env vars on startup (fail fast if `DATABASE_URL` is missing)

---

## 7. Database Design Essentials

### 7.1 Key Design Decisions to Understand

| Decision | Reasoning |
|---|---|
| `idempotency_key` has a UNIQUE index | Enables atomic check-and-insert in a transaction |
| `status` has an index | DLQ queries filter by status — needs to be fast |
| `payload` is JSONB | Flexible schema for any event type without migrations |
| `delivery_attempts` is a separate table | Normalized — allows N attempts per event, each with full metadata |
| Soft delete on `endpoints` (is_active flag) | Preserve historical event → endpoint relationships |

### 7.2 Transactions for Idempotency (Critical)
```sql
BEGIN;
  SELECT id FROM events WHERE idempotency_key = $1 FOR UPDATE;
  -- if row found: ROLLBACK and return existing
  -- if not found: INSERT new event
COMMIT;
```
The `FOR UPDATE` lock prevents two concurrent requests with the same key from both inserting.

### 7.3 ORM Choice: Prisma vs Drizzle
| | Prisma | Drizzle |
|---|---|---|
| **DX** | Excellent, great tooling | Lower-level, more SQL-like |
| **Performance** | Moderate | Faster (less overhead) |
| **Type safety** | ✅ Strong | ✅ Strong |
| **Migrations** | Prisma Migrate | Drizzle-kit |

Either works for Zyvan. Prisma is recommended for faster dev. Drizzle for performance-critical paths.

---

## 8. Tooling You Must Know

| Tool | Purpose | Learn Before |
|---|---|---|
| **Node.js 18+** | Runtime (native fetch, `crypto.webcrypto`) | Everything |
| **TypeScript** | Type-safe development | Everything |
| **Express** | HTTP server framework | M1 |
| **Prisma or Drizzle** | DB ORM and migrations | M1 |
| **BullMQ** | Job queue on top of Redis | M1 |
| **Zod** | Runtime schema validation | M1 |
| **Docker Compose** | Local infra (Postgres + Redis) | M1 |
| **ioredis** | Redis client for Node.js | M1 |
| **Next.js 14+** | Dashboard (App Router) | M5 |
| **Jest / Vitest** | Unit + integration testing | M2 |
| **Supertest** | HTTP integration testing | M2 |

---

## 9. Recommended Learning Order

Follow this sequence if any of the above is unfamiliar:

```
Week 1 — Foundations
  ├── How webhooks work (MDN / Stripe docs are a great reference)
  ├── PostgreSQL transactions + ACID properties
  ├── Redis fundamentals (data structures, persistence)
  └── Docker Compose basics

Week 2 — Queue & Async Patterns  
  ├── BullMQ documentation (Queues, Workers, delayed jobs)
  ├── Exponential backoff + jitter (understand the math)
  ├── Event-driven architecture patterns
  └── Idempotency patterns in distributed systems

Week 3 — Security & Reliability
  ├── HMAC-SHA256 (Node.js crypto module)
  ├── SSRF attacks and prevention
  ├── API key design patterns
  └── Dead Letter Queues — design and operations

Week 4 — Tooling & TypeScript
  ├── Prisma or Drizzle ORM setup + migrations
  ├── Zod for runtime validation
  ├── Express middleware and error handling
  └── BullMQ Worker pattern in TypeScript
```

---

## Quick Reference: Key Files to Create (by Milestone)

```
M1 — Core Engine
  server/src/config/db.ts          → Prisma/Drizzle client setup
  server/src/config/queue.ts       → BullMQ queue setup
  server/src/api/events/route.ts   → POST /v1/events
  server/src/core/ingest.ts        → Idempotency + DB write logic
  server/src/workers/dispatch.ts   → BullMQ worker + HTTP delivery
  server/src/models/schema.ts      → DB schema (events, endpoints, attempts)

M2 — Reliability
  server/src/core/retry.ts         → Backoff calculation
  server/src/core/dlq.ts           → DLQ routing + replay logic
  server/src/api/events/replay.ts  → POST /v1/events/:id/replay

M3 — Security
  server/src/core/signing.ts       → HMAC-SHA256 signature generation
  server/src/proxy/outgoing.ts     → Outgoing proxy with SSRF filter

M4 — Observability
  server/src/middleware/logger.ts  → Structured JSON logging
  server/src/api/health.ts         → GET /health liveness probe

M5 — Dashboard
  client/app/events/page.tsx       → Event browser
  client/app/dlq/page.tsx          → DLQ management
  client/app/analytics/page.tsx    → Charts and metrics
```

---

*[Back to README](../README.md) | [PRD](PRD.md) | [Architecture](architecture.md) | [Technical Explainer](explainer.md)*
