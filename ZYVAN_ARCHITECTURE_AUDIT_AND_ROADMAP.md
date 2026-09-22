# Zyvan — Comprehensive Codebase Audit, Reliability Architecture & Startup Roadmap

> **Target Platform:** Zyvan — Enterprise Webhook & Event Delivery Infrastructure  
> **Date:** September 2026  
> **Status:** Deep Technical Review, Vulnerability Report & Production Blueprint  
> **Author:** Architecture Audit Team  

---

## Table of Contents

1. [Executive Summary: Reality vs. Claims Matrix](#1-executive-summary-reality-vs-claims-matrix)
2. [Critical Errors & Broken Builds in Current Codebase](#2-critical-errors--broken-builds-in-current-codebase)
3. [Security Vulnerabilities & "Patchwork" Anti-Patterns](#3-security-vulnerabilities--patchwork-anti-patterns)
   - [3.1 BOLA / IDOR in Authentication Middleware](#31-bola--idor-in-authentication-middleware)
   - [3.2 Anti-SSRF Defense Bypass in Outbound Webhooks](#32-anti-ssrf-defense-bypass-in-outbound-webhooks)
   - [3.3 RabbitMQ Head-of-Line (HoL) Blocking on Retries](#33-rabbitmq-head-of-line-hol-blocking-on-retries)
   - [3.4 Dual-Write Hazard & Missing Transactional Outbox](#34-dual-write-hazard--missing-transactional-outbox)
   - [3.5 Phantom Rate Limiting & Concurrency Semaphores](#35-phantom-rate-limiting--concurrency-semaphores)
   - [3.6 Frontend Mock Data Fallbacks & Simulated Metrics](#36-frontend-mock-data-fallbacks--simulated-metrics)
   - [3.7 Broken Replay Logic for Multi-Destination Events](#37-broken-replay-logic-for-multi-destination-events)
4. [Current Component Status (Built vs. Remaining)](#4-current-component-status-built-vs-remaining)
5. [Reliable Webhook Infrastructure Blueprint (Industry Standard: Svix / Hookdeck / Stripe)](#5-reliable-webhook-infrastructure-blueprint-industry-standard-svix--hookdeck--stripe)
   - [5.1 End-to-End System Topology](#51-end-to-end-system-topology)
   - [5.2 The Transactional Outbox Pattern & Publisher Confirms](#52-the-transactional-outbox-pattern--publisher-confirms)
   - [5.3 Tiered Delay Queue Architecture](#53-tiered-delay-queue-architecture)
   - [5.4 Bulletproof SSRF-Safe HTTP Client with IP Pinning](#54-bulletproof-ssrf-safe-http-client-with-ip-pinning)
   - [5.5 Distributed Concurrency Semaphores & Rate Limiting](#55-distributed-concurrency-semaphores--rate-limiting)
6. [Developer Experience & Docs Engine (Trigger.dev / Mintlify Standard)](#6-developer-experience--docs-engine-triggerdev--mintlify-standard)
   - [6.1 The Missing `@zyvan/sdk` Client Package](#61-the-missing-zyvansdk-client-package)
   - [6.2 Real Interactive API Playground](#62-real-interactive-api-playground)
   - [6.3 Local Developer CLI (`zyvan listen`)](#63-local-developer-cli-zyvan-listen)
   - [6.4 Docs TypeScript & Next.js Fixes](#64-docs-typescript--nextjs-fixes)
7. [How to Scale Zyvan as a High-Growth Startup](#7-how-to-scale-zyvan-as-a-high-growth-startup)
   - [7.1 Enterprise Auth, Organizations & RBAC](#71-enterprise-auth-organizations--rbac)
   - [7.2 Data Tiering: PostgreSQL, Redis & Cold Storage](#72-data-tiering-postgresql-redis--cold-storage)
   - [7.3 Observability: OpenTelemetry & Prometheus Metrics](#73-observability-opentelemetry--prometheus-metrics)
   - [7.4 Usage Metering & Stripe Monetization](#74-usage-metering--stripe-monetization)
8. [Phased Implementation Plan](#8-phased-implementation-plan)

---

## 1. Executive Summary: Reality vs. Claims Matrix

Zyvan has established an impressive high-level architecture: PostgreSQL schema design, Express REST API with Zod validation, asymmetric AES-256-GCM secret encryption, HMAC-SHA256 timestamped signatures, and a clean Next.js documentation shell.

However, a forensic audit of the implementation reveals substantial discrepancies between what is documented (or claimed in `CODEBASE_ANALYSIS.md`) and what is actually running in code:

| Component | Documented / Intended State | Actual Implementation in Codebase | Severity |
| :--- | :--- | :--- | :--- |
| **Authentication** | Multi-tenant auth with JWT & API keys | JWT verifies signature, but **blindly trusts `X-Project-Id` without membership check (IDOR)** | 🚨 Critical Vulnerability |
| **SSRF Defense** | Real-time DNS & CIDR filtering before outbound calls | Implemented in `crypto`, **NEVER called by Worker HTTP client**. No DNS pinning. Follows redirects into private subnets | 🚨 Critical Vulnerability |
| **RabbitMQ Retries** | "Polling-free retries with per-message TTL" | Uses standard queue with per-message `expiration`. **Causes Head-of-Line blocking** | 🔴 Severe Reliability Bug |
| **Ingestion Pipeline** | Guaranteed at-least-once delivery | Commits to DB, then calls unconfirmed AMQP publish. If RabbitMQ is down, **events are stuck in PostgreSQL forever (No Outbox/Reconciler)** | 🔴 Data Loss / Stuck State |
| **Rate & Concurrency Limits** | Tenant concurrency caps & rate limiting | Fields selected from database, but **completely ignored by the worker**. No Redis connection | 🟡 Incomplete Patchwork |
| **Replay Engine** | Immutable replay lineage | Replay loop contains a hard bug: **passes `targetDestinationIds[0]` to all destinations** | 🔴 Delivery Routing Bug |
| **Developer Docs** | Trigger.dev-grade MDX engine | Great visual components, but **fails TypeScript compilation (`apps/web`)** | 🟡 Build Broken |
| **SDK Ecosystem** | Official `@zyvan/sdk`, Python, Go | Documented in MDX docs, **zero SDK packages exist** | 🔴 Missing Core Feature |
| **Dashboard UI** | Live analytics, throughput, latencies | Methods return **hardcoded `Math.sin()` curves and fake `Math.random()` seeds** | 🟡 Mocked Simulation |
| **Health Check** | Redis readiness check | Hardcoded `checks.redis = 'ok'` without connecting to Redis | 🟡 Patchwork Stub |

---

## 2. Critical Errors & Broken Builds in Current Codebase

### A. TypeScript Typecheck Failures (`apps/web`)
Running `npx tsc --noEmit --project apps/web/tsconfig.json` fails with 3 blocking errors:

1. **`apps/web/src/app/docs/layout.tsx:31`**
   ```ts
   // apps/web/src/app/docs/layout.tsx:31:9
   error TS2353: Object literal may only specify known properties, and 'heading' does not exist in type
   '{ slug: string; title: string; description: string; category: string; apiMethod: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | undefined; }'.
   ```
   * **Root Cause:** In `DocsLayout`, `items` is initialized as `const items = [{ slug, title, description, category, apiMethod }]`. TypeScript infers the array type from the first object, which lacks optional fields `heading` and `headingId`. When `items.push({ heading, headingId, ... })` executes for Table of Contents entries, TypeScript throws TS2353.
   * **Fix:** Explicitly type `items` using `SearchResultItem[]` imported from `@/lib/docs-types`.

2. **`apps/web/src/components/docs/MdxComponents.tsx:39 & 42`**
   ```ts
   // apps/web/src/components/docs/MdxComponents.tsx:39:38
   error TS2503: Cannot find namespace 'JSX'.
   error TS2769: No overload matches this call.
   ```
   * **Root Cause:** In React 19 and modern `@types/react`, the global `JSX` namespace is removed in favor of `React.JSX.IntrinsicElements` or `React.ElementType`.
   * **Fix:** Use `keyof React.JSX.IntrinsicElements` and proper heading level typing.

### B. Broken Linter (`apps/api`)
Running `npm run lint` fails across workspaces:
* **Root Cause:** ESLint v9 is installed at root, but `apps/api` has a legacy `.eslintrc.json` file. ESLint 9 requires the flat configuration format (`eslint.config.mjs`).

### C. Critical Replay Multi-Destination Bug (`apps/api`)
In [apps/api/src/modules/replay/service.ts:138-151](file:///d:/All%20Projects/Resume%20project/zyvan/apps/api/src/modules/replay/service.ts#L138-L151):
```typescript
// apps/api/src/modules/replay/service.ts
const results = await prisma.$transaction(async (tx) => {
  const created: Array<{ replayId: string; deliveryId: string; destinationId: string }> = [];
  for (const destId of targetDestinationIds) {
    const newDelivery = await tx.delivery.create({ ... });
    const replay = await tx.replay.create({ ... });
    created.push({ replayId: replay.id, deliveryId: newDelivery.id });
  }
  return created;
});

// 🚨 BUG: Loops through results, but always sends targetDestinationIds[0]!
for (const item of results) {
  try {
    publishDeliveryJob({
      deliveryId: item.deliveryId,
      eventId: event.id,
      destinationId: targetDestinationIds[0], // <--- BUG!
      attemptNo: 1,
    });
  } catch (err) { ... }
}
```
* **Impact:** If an event was sent to 3 destinations (`dest_warehouse`, `dest_crm`, `dest_analytics`), replaying the event will send **all 3 deliveries to `dest_warehouse`**. The other two destinations never receive their replay.

---

## 3. Security Vulnerabilities & "Patchwork" Anti-Patterns

### 3.1 BOLA / IDOR in Authentication Middleware
In [apps/api/src/middleware/authenticate.ts:57-73](file:///d:/All%20Projects/Resume%20project/zyvan/apps/api/src/middleware/authenticate.ts#L57-L73):

```typescript
// 1. Try verifying as a User JWT session token first
const userPayload = verifyUserToken(token);
if (userPayload) {
  // Check if project was specified via X-Project-Id header, otherwise use payload projectId
  const requestedProjectId = (req.headers['x-project-id'] as string) || userPayload.projectId;

  req.auth = {
    type: 'user',
    userId: userPayload.userId,
    userEmail: userPayload.email,
    projectId: requestedProjectId, // 🚨 Untrusted client input accepted!
    scopes: ['*'],                 // 🚨 Full wildcard admin scopes!
  };
  next();
  return;
}
```

* **Vulnerability Analysis:**
  1. A valid signed JWT gives any logged-in user `scopes: ['*']`.
  2. The server blindly overwrites `req.auth.projectId` with whatever value is in `X-Project-Id`.
  3. It **never checks** whether `userPayload.userId` is listed as an owner or member in `project_members` for that `requestedProjectId`.
* **Exploit Scenario:** User A registers for free. User A grabs User B's project UUID (or brute forces/sniffs it) and sends:
  `GET /v1/destinations` with header `X-Project-Id: <User_B_Project_ID>`.
  User A now has full read/write/delete access to User B's webhooks, signing keys, DLQ replays, and decrypted secrets.

### 3.2 Anti-SSRF Defense Bypass in Outbound Webhooks
In [apps/worker/src/services/http-client.ts:74-79](file:///d:/All%20Projects/Resume%20project/zyvan/apps/worker/src/services/http-client.ts#L74-L79):

```typescript
// The Worker makes direct fetch without validating IP or DNS:
const response = await fetch(req.url, {
  method: 'POST',
  headers,
  body: req.payload,
  signal: controller.signal,
});
```

* **Vulnerability Analysis:**
  1. `validateUrl()` exists in `packages/crypto/src/ssrf.ts`, but it is **only called when creating a destination in the API**. It is **never called by the worker** before dispatch.
  2. **DNS Rebinding Attack:** Attacker registers `https://hook.attacker.com` pointing to `93.184.216.34` (passes API check). Once registered, attacker changes DNS records for `hook.attacker.com` to resolve to `169.254.169.254` (AWS metadata) or `10.0.0.1`. When the worker fires the webhook, it connects directly to internal infrastructure!
  3. **HTTP Redirect Vulnerability:** Node's standard `fetch()` follows redirects (`301`, `302`, `307`) by default. A public destination URL can respond with `302 Found -> Location: http://169.254.169.254/latest/meta-data/iam/security-credentials/`. Node follows the redirect, retrieves AWS credentials, and stores them in the `attempts.response` table in PostgreSQL!
  4. **IPv6 Bypass:** `validateUrl()` only uses `dns.resolve4`. It completely ignores IPv6 loopback (`::1`), link-local (`fe80::/10`), unique local (`fc00::/7`), and IPv4-mapped IPv6 (`::ffff:127.0.0.1`).

### 3.3 RabbitMQ Head-of-Line (HoL) Blocking on Retries
In [apps/worker/src/lib/rabbitmq.ts:90-94](file:///d:/All%20Projects/Resume%20project/zyvan/apps/worker/src/lib/rabbitmq.ts#L90-L94):

```typescript
ch.sendToQueue(RETRY_QUEUE, Buffer.from(payload), {
  persistent: true,
  contentType: 'application/json',
  expiration: String(delayMs), // 🚨 Per-message TTL
});
```

* **Vulnerability / Architectural Flaw:**
  * In standard AMQP RabbitMQ queues, message expiration is **only evaluated when the message reaches the HEAD of the queue**.
  * If Job A has an exponential backoff delay of **60 seconds** and is enqueued first, and Job B arrives 100ms later with a delay of **1 second**, **Job B will not be retried until Job A reaches the head and expires after 60 seconds**.
  * This creates catastrophic cascading delays across the entire delivery pipeline under high concurrency.

### 3.4 Dual-Write Hazard & Missing Transactional Outbox
In [apps/api/src/modules/events/service.ts:94-138](file:///d:/All%20Projects/Resume%20project/zyvan/apps/api/src/modules/events/service.ts#L94-L138):

```typescript
// 1. Commit DB transaction
result = await eventRepo.createWithDeliveries(...);

// 2. Publish to RabbitMQ
for (const delivery of result.deliveries) {
  try {
    publishDeliveryJob(...);
  } catch (err) {
    logger.error('Failed to publish delivery job — event is persisted and can be retried');
  }
}
```

* **The Problem:**
  1. The DB transaction commits.
  2. If RabbitMQ is down, the network disconnects, or the Node.js process crashes/restarts before or during `publishDeliveryJob()`, the catch block logs the error, but **nothing ever retries publishing**.
  3. The delivery record remains permanently stuck in `status: 'queued'` in PostgreSQL. There is no outbox table, no CDC (Change Data Capture), and no reconciliation sweeper.
  4. Furthermore, `channel.publish()` uses unconfirmed writes. If the RabbitMQ broker crashes before fsyncing messages, in-flight deliveries are lost silently.

### 3.5 Phantom Rate Limiting & Concurrency Semaphores
In [apps/worker/src/services/delivery-service.ts:51-53](file:///d:/All%20Projects/Resume%20project/zyvan/apps/worker/src/services/delivery-service.ts#L51-L53):

```typescript
const delivery = await prisma.delivery.findUnique({
  where: { id: job.deliveryId },
  include: {
    destination: {
      include: {
        tenant: { select: { id: true, status: true, concurrencyLimit: true, rateLimit: true } },
      },
    },
  },
});
```

* **The Patchwork:**
  * The code selects `concurrencyLimit` and `rateLimit` from the database.
  * Then it proceeds directly to `sendWebhook()` without ever checking, decrementing, or validating either limit.
  * If 2,000 webhook events are enqueued for a customer's endpoint, workers will fire all 2,000 HTTP requests in parallel, easily overwhelming or DDoSing the customer's server.
  * In `apps/api/src/routes/health.ts:37`:
    ```typescript
    // Check Redis (placeholder — will be connected in Phase 2+)
    checks.redis = 'ok';
    ```
  * `ioredis` is installed and Redis is running in Docker, but Redis is never initialized or used.

### 3.6 Frontend Mock Data Fallbacks & Simulated Metrics
In [apps/web/src/lib/api-client.ts](file:///d:/All%20Projects/Resume%20project/zyvan/apps/web/src/lib/api-client.ts) and [auth-context.tsx](file:///d:/All%20Projects/Resume%20project/zyvan/apps/web/src/lib/auth-context.tsx):
* **Fake Session Generation:** When backend proxy requests timeout or fail, `auth-context.tsx` generates `zyvan_jwt_local_${Date.now()}` and puts it in `localStorage`. All future requests with this fake token get 401 Unauthorized from the backend.
* **Fake OAuth:** Clicking "Sign in with Google" or "Sign in with GitHub" executes `loginWithDemo()`.
* **Seed Data Pollution:** In `api-client.ts:730`:
  ```typescript
  // If backend returns empty array (0 events for a new user):
  if (rawList.length > 0) { ... }
  // Falls through to:
  return this.getStorage('zyvan_local_events', SEED_EVENTS);
  ```
  A real user who creates a new account always sees mock seed data ("Stripe Billing Webhook Receiver", "Shopify Order Ingestion Queue") instead of an empty onboarding state.
* **Synthetic Graph Math:** `getThroughputData()` generates sine waves using `Math.sin(i) * 140` and random numbers. There is no real timeseries analytics backend endpoint.
* **Fake Docs Sandbox:** In `apps/web/src/components/docs/mdx/ApiPlayground.tsx`, clicking "Send Request" triggers a `setTimeout(450)` and returns hardcoded JSON with `Math.random()` latency.

---

## 4. Current Component Status (Built vs. Remaining)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ZYVAN MODULE STATUS                           │
├───────────────────────────────┬──────────────┬─────────────────────────┤
│ Module                        │ Completion   │ Status & Gaps           │
├───────────────────────────────┼──────────────┼─────────────────────────┤
│ PostgreSQL Database Schema    │ 95%          │ Needs outbox table      │
│ Ingestion API (/v1/events)    │ 85%          │ Needs Outbox pattern    │
│ Authentication & Sessions     │ 40%          │ IDOR bug, no OAuth/RBAC │
│ Project / Tenant Management   │ 75%          │ Missing member invites  │
│ Destination Management        │ 90%          │ Solid AES-256 crypto    │
│ Worker Dispatch Engine        │ 60%          │ Missing SSRF & limiter  │
│ Retry & Backoff Pipeline      │ 65%          │ RabbitMQ HoL blocking   │
│ Dead Letter Queue & Replay    │ 80%          │ Multi-dest replay bug   │
│ Documentation Platform (MDX)  │ 85%          │ Typecheck errors, mock  │
│ Client SDK (@zyvan/sdk)       │ 0%           │ Documented, not built   │
│ Local CLI (`zyvan listen`)    │ 0%           │ Not built               │
│ Production Observability      │ 20%          │ Missing Prometheus/OTel │
└───────────────────────────────┴──────────────┴─────────────────────────┘
```

---

## 5. Reliable Webhook Infrastructure Blueprint (Industry Standard: Svix / Hookdeck / Stripe)

### 5.1 End-to-End System Topology

```
                   Producer Application (Customer)
                                 │
                                 │ 1. POST /v1/events
                                 │    Headers: Authorization, Idempotency-Key
                                 ▼
         ┌───────────────────────────────────────────────┐
         │             Zyvan Ingestion Gateway           │
         │  - Rate Limiter (Token Bucket per API Key)    │
         │  - Zod Request Schema Validation              │
         │  - Resolve Active Project & Tenant            │
         │  - Enforce DB Unique Constraint               │
         └───────────────────────┬───────────────────────┘
                                 │
                     BEGIN TRANSACTION (PostgreSQL)
                     ├── INSERT INTO events (idempotent)
                     ├── INSERT INTO deliveries (status: 'queued')
                     └── INSERT INTO outbox (delivery_id, payload)
                     COMMIT TRANSACTION
                                 │
                                 ├──► Return 202 Accepted { event_id }
                                 │
                                 ▼
         ┌───────────────────────────────────────────────┐
         │            Outbox Publisher Service           │
         │  - Reads committed outbox entries             │
         │  - Uses AMQP Publisher Confirms (waitForAck)  │
         │  - Deletes/Marks outbox record on fsync       │
         └───────────────────────┬───────────────────────┘
                                 │
                                 ▼
         ┌───────────────────────────────────────────────┐
         │           RabbitMQ Event Exchange             │
         │  - Topic Exchange: zyvan.events               │
         │  - Queue: zyvan.delivery (Main Queue)         │
         │  - Queues: zyvan.retry.10s, retry.1m, etc.    │
         └───────────────────────┬───────────────────────┘
                                 │ Prefetch(10)
                                 ▼
         ┌───────────────────────────────────────────────┐
         │                 Zyvan Worker                  │
         │                                               │
         │ 1. Check Redis Destination Concurrency Cap    │
         │    (INCR dest:active < limit, else requeue)   │
         │                                               │
         │ 2. Check Redis Tenant Rate Limit              │
         │    (Token bucket check, else delay)           │
         │                                               │
         │ 3. SSRF & Anti-Rebinding Guard                │
         │    - Resolve DNS immediately before connect   │
         │    - Pin Socket IP (Block RFC 1918 / Cloud)   │
         │    - Disable auto-redirect follow             │
         │                                               │
         │ 4. Decrypt Secret & Sign Payload              │
         │    - AES-256-GCM decrypt                      │
         │    - HMAC-SHA256 signature header             │
         │                                               │
         │ 5. Outbound HTTP Request                      │
         │    - Strict timeout budget (15s)              │
         │    - Truncate response body (max 4KB)         │
         │                                               │
         │ 6. Write Immutable Attempt Record             │
         └───────────────────────┬───────────────────────┘
                                 │
               ┌─────────────────┴─────────────────┐
       HTTP 2xx (Success)                  HTTP 4xx / 5xx / Timeout
               │                                   │
               ▼                                   ▼
      Mark Delivery Complete            Check Retry Policy
      Mark Event Delivered              ├── If Attempts < Max:
                                        │   Route to Tiered Delay Queue
                                        └── If Exhausted or 4xx:
                                            Move to DLQ & Mark Failed
```

### 5.2 The Transactional Outbox Pattern & Publisher Confirms

To eliminate the dual-write bug and guarantee **zero lost events**:

1. **Add `outbox` Table:**
   ```prisma
   model Outbox {
     id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
     deliveryId String   @map("delivery_id") @db.Uuid
     payload    Json
     createdAt  DateTime @default(now()) @map("created_at")

     @@index([createdAt])
     @@map("outbox")
   }
   ```
2. **Atomic Commit:**
   Save the event, deliveries, and outbox rows in one single `prisma.$transaction`.
3. **Confirmed Publishing:**
   Use an AMQP Confirm Channel (`conn.createConfirmChannel()`). Publish each job and await `channel.waitForConfirms()`. Once confirmed by RabbitMQ, delete the row from `outbox`.
4. **Reconciler Daemon:**
   A background sweeper runs every 30 seconds to pick up any outbox records older than 1 minute (handling crashes or unacknowledged socket buffers).

### 5.3 Tiered Delay Queue Architecture

To fix RabbitMQ Head-of-Line blocking without requiring external plugins:

Create fixed-delay retry queues with queue-level TTLs:
* `zyvan.retry.10s` (`x-message-ttl: 10000`, `x-dead-letter-exchange: zyvan.events`, `x-dead-letter-routing-key: delivery.process`)
* `zyvan.retry.1m` (`x-message-ttl: 60000`)
* `zyvan.retry.5m` (`x-message-ttl: 300000`)
* `zyvan.retry.15m` (`x-message-ttl: 900000`)
* `zyvan.retry.1h` (`x-message-ttl: 3600000`)

When a delivery fails:
1. Determine attempt number.
2. Select closest queue tier (`retry.10s` for attempt 1, `retry.1m` for attempt 2, etc.).
3. Publish to that queue. All messages in that queue have identical TTLs, guaranteeing **zero Head-of-Line blocking**.

### 5.4 Bulletproof SSRF-Safe HTTP Client with IP Pinning

Replace basic `fetch(req.url)` with a custom Node.js `undici.Agent` or `https.Agent` that executes DNS resolution and IP pinning at the socket connection level:

```typescript
import dns from 'node:dns/promises';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';

const BLOCKED_SUBNETS = [
  /^127\./,           // Loopback
  /^10\./,            // RFC 1918 Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // RFC 1918 Class B
  /^192\.168\./,      // RFC 1918 Class C
  /^169\.254\./,      // Link-local & AWS Metadata (169.254.169.254)
  /^0\./,             // Broadcast
  /^::1$/,            // IPv6 loopback
  /^[fF][cCdD]/,      // IPv6 Unique Local
  /^[fF][eE][89aAbB]/ // IPv6 Link-Local
];

export async function resolveSafeIp(hostname: string): Promise<string> {
  const lookups = await dns.lookup(hostname, { all: true });
  for (const { address } of lookups) {
    for (const regex of BLOCKED_SUBNETS) {
      if (regex.test(address)) {
        throw new Error(`SSRF Blocked: ${hostname} resolved to private/internal IP ${address}`);
      }
    }
  }
  return lookups[0].address;
}
```

* **Socket Pinning:** Pass a custom `lookup` callback to `https.request` that returns only the pre-validated IP address, defeating DNS rebinding.
* **Redirect Protection:** Set `maxRedirections: 0`. If a 3xx status is returned, parse the `Location` header, pass it through `resolveSafeIp()`, and explicitly initiate a new request.

### 5.5 Distributed Concurrency Semaphores & Rate Limiting

To prevent overwhelming destination endpoints:

```typescript
// In Zyvan Worker before dispatch:
const destinationLockKey = `lock:dest:${destination.id}`;
const activeCount = await redis.incr(destinationLockKey);

if (activeCount === 1) {
  await redis.expire(destinationLockKey, 60); // Auto-expire safety
}

if (activeCount > destination.tenant.concurrencyLimit) {
  await redis.decr(destinationLockKey);
  // Re-queue message to RabbitMQ with a 1-second delay
  channel.sendToQueue('zyvan.retry.1s', ...);
  return;
}

try {
  await sendWebhook(...);
} finally {
  await redis.decr(destinationLockKey);
}
```

---

## 6. Developer Experience & Docs Engine (Trigger.dev / Mintlify Standard)

### 6.1 The Missing `@zyvan/sdk` Client Package

Developers should not manually craft HTTP requests and compute HMAC signatures. Create `packages/sdk`:

```typescript
import { ZyvanClient } from '@zyvan/sdk';

const zyvan = new ZyvanClient({
  apiKey: process.env.ZYVAN_API_KEY!,
  projectId: process.env.ZYVAN_PROJECT_ID!,
});

// 1. Send an event
const event = await zyvan.events.send({
  type: 'order.completed',
  idempotencyKey: 'order_1092',
  tenantId: 'tenant_acme',
  payload: { orderId: 'ord_123', total: 4999 },
});

// 2. Verify webhook on receiver end (Zero-dependency Webhook Verifier)
export function handleWebhook(rawBody: string, headers: Record<string, string>, secret: string) {
  return ZyvanClient.webhooks.verify({
    payload: rawBody,
    signature: headers['x-zyvan-signature'],
    timestamp: headers['x-zyvan-timestamp'],
    secret: secret,
    toleranceMs: 300000, // 5 min anti-replay tolerance
  });
}
```

### 6.2 Real Interactive API Playground

Update [apps/web/src/components/docs/mdx/ApiPlayground.tsx](file:///d:/All%20Projects/Resume%20project/zyvan/apps/web/src/components/docs/mdx/ApiPlayground.tsx):
* Allow the developer to enter their own API key (or provide a sandbox key).
* Use the Next.js backend proxy (`/api/proxy/v1/events`) to execute the real HTTP call.
* Display the actual status code, actual latency, and real response from the database.

### 6.3 Local Developer CLI (`zyvan listen`)

Like `stripe listen` and `svix listen`, developers need to receive webhooks on `http://localhost:3000`:
* Build `packages/cli` (`npx zyvan listen --forward-to http://localhost:3000/api/webhooks`).
* Opens a persistent WebSocket/SSE tunnel to the Zyvan API server.
* Zyvan automatically forwards test events to the local process, eliminating the need for ngrok.

### 6.4 Docs TypeScript & Next.js Fixes

Apply the required fixes to `apps/web`:
1. In `apps/web/src/app/docs/layout.tsx`:
   Type `items` explicitly as `SearchResultItem[]` to resolve TS2353.
2. In `apps/web/src/components/docs/MdxComponents.tsx`:
   Use `React.ElementType` or `React.JSX.IntrinsicElements` to resolve React 19 JSX errors.

---

## 7. How to Scale Zyvan as a High-Growth Startup

### 7.1 Enterprise Auth, Organizations & RBAC

1. **HttpOnly Secure Session Cookies:**
   Eliminate JWT storage in `localStorage`. Use HttpOnly, Secure, SameSite=Lax cookies to prevent XSS session theft.
2. **Organization & Membership Scoping:**
   * An Organization has multiple Projects (Production, Staging, Development).
   * A User belongs to an Organization with roles:
     * `Owner`: Full billing, project, and team management.
     * `Admin`: Manage destinations, API keys, and settings.
     * `Developer`: Ingest events, view delivery logs, trigger replays.
     * `Viewer`: Read-only access to metrics and attempts.
3. **SSO & OAuth:**
   Implement real GitHub and Google OAuth, plus SAML/SSO for enterprise tier (via WorkOS or BoxyHQ).

### 7.2 Data Tiering: PostgreSQL, Redis & Cold Storage

At 100M+ events per month, storing every HTTP attempt in PostgreSQL leads to index bloat:
* **Hot Storage (PostgreSQL):** Events and Deliveries retained for 7 to 14 days.
* **Cache / Semaphores (Redis):** Idempotency deduplication keys (1-hour TTL), token bucket rate limiters, destination concurrency locks.
* **Cold Storage (ClickHouse / Parquet on S3):** Historical attempt bodies, headers, and logs streamed to S3 or ClickHouse. The dashboard queries recent attempts from Postgres and historical archives from ClickHouse.

### 7.3 Observability: OpenTelemetry & Prometheus Metrics

* **Distributed Tracing:** Worker injects W3C `traceparent` headers into outbound webhooks, allowing customers using Datadog/NewRelic to connect their outbound traces with inbound webhooks.
* **Prometheus `/metrics` Endpoint:**
  * `zyvan_events_ingested_total{tenant, status}`
  * `zyvan_deliveries_total{destination, status_code}`
  * `zyvan_delivery_latency_seconds{quantile="0.95"}`
  * `zyvan_queue_depth{queue="zyvan.delivery"}`
  * `zyvan_worker_active_concurrency`

### 7.4 Usage Metering & Stripe Monetization

* **Free Developer Tier:** 50,000 deliveries/month, 3-day log retention, 5 destinations.
* **Pro Tier ($49/mo):** 500,000 deliveries/month, 30-day retention, unlimited destinations, custom retry policies.
* **Enterprise Tier ($499+/mo):** Custom volume, 90-day retention, dedicated static outbound IPs, custom domains, 99.99% uptime SLA.
* **Metering Pipeline:** Worker emits delivery usage events to a Redis stream; a daily cron syncs usage to Stripe Usage Records.

---

## 8. Phased Implementation Plan

### Phase 1: Security & Core Compilation Fixes (Immediate)
- [ ] Fix TypeScript compilation errors in `apps/web/src/app/docs/layout.tsx` and `MdxComponents.tsx`.
- [ ] Fix ESLint 9 configuration in `apps/api`.
- [ ] Patch BOLA/IDOR in `authenticate.ts`: Verify `req.auth.userId` membership against `project_members` before honoring `X-Project-Id`.
- [ ] Fix the multi-destination replay bug in `apps/api/src/modules/replay/service.ts`.
- [ ] Wire `resolveSafeIp` and anti-SSRF protections into `apps/worker/src/services/http-client.ts`. Disable auto-redirects.

### Phase 2: Webhook Reliability & Delivery Engine
- [ ] Add `outbox` table to PostgreSQL schema.
- [ ] Refactor `ingestEvent` to use the Transactional Outbox pattern with AMQP publisher confirms.
- [ ] Replace single per-message TTL retry queue with Tiered Delay Queues (`retry.10s`, `retry.1m`, `retry.5m`).
- [ ] Connect Redis in `apps/worker` to enforce destination rate limits and concurrency semaphores.
- [ ] Fix health check to verify real Redis connectivity.

### Phase 3: Developer Experience & Docs
- [ ] Build `@zyvan/sdk` in `packages/sdk` (Node.js/TypeScript client + webhook verification utility).
- [ ] Update `ApiPlayground.tsx` in docs to execute real API requests via backend proxy.
- [ ] Remove mock `SEED_EVENTS` fallback when user has 0 events; display true empty states.
- [ ] Implement a real timeseries aggregation endpoint for throughput and latency metrics.

### Phase 4: Production Readiness & Startup Features
- [ ] Replace `localStorage` JWT with HttpOnly Secure Cookies.
- [ ] Add GitHub / Google OAuth integration.
- [ ] Add Prometheus `/metrics` endpoints to API and Worker.
- [ ] Build `packages/cli` for `npx zyvan listen` local tunneling.
