# Zyvan — System Architecture

This document explains how Zyvan is structured, how data flows through the system, and how high reliability is achieved even when networks and destination servers fail.

---

## 1. High-Level Architecture Overview

Zyvan is divided into two decoupled processes:
1. **API Server (`apps/api`)**: Responsible for fast, synchronous acceptance of events. It validates, deduplicates, persists to database, enqueues to RabbitMQ, and returns `202 Accepted` immediately (under 20ms).
2. **Worker Daemon (`apps/worker`)**: Responsible for asynchronous execution. It consumes delivery jobs from RabbitMQ, decrypts secrets, generates HMAC signatures, sends HTTP POST requests, records attempt history, and handles retries or DLQ transitions.

```mermaid
flowchart TD
    subgraph ClientLayer ["1. Client Application"]
        Client["Customer App / Webhook Producer"]
    end

    subgraph APILayer ["2. Zyvan API (Express + TypeScript)"]
        Auth["Auth & Scope Check"]
        Val["Zod Validation"]
        Idemp["Idempotency Guard"]
        APIRabbit["AMQP Publisher"]
    end

    subgraph DataLayer ["3. PostgreSQL (Source of Truth)"]
        PG[(PostgreSQL Database)]
    end

    subgraph QueueLayer ["4. RabbitMQ (Execution Mechanism)"]
        Ex["zyvan.events (Exchange)"]
        QDel["zyvan.delivery (Main Queue)"]
        QRet["zyvan.delivery.retry (TTL + DLX)"]
    end

    subgraph WorkerLayer ["5. Zyvan Worker Engine"]
        Worker["Worker Consumer"]
        Signer["HMAC-SHA256 Signer"]
        HTTP["HTTP Client (Timeout + SSRF)"]
        RetryEng["Retry Engine (Backoff + Jitter)"]
    end

    subgraph Endpoints ["6. Destination Endpoints"]
        DestA["Customer Webhook URL (200 OK)"]
        DestB["Customer Webhook URL (500 Error)"]
    end

    Client -->|POST /v1/events| Auth
    Auth --> Val --> Idemp
    Idemp -->|1. Commit Transaction| PG
    PG -->|2. Event & Deliveries Created| APIRabbit
    APIRabbit -->|3. Publish Delivery Job| Ex
    Ex --> QDel
    QDel -->|4. Consume Job| Worker
    Worker --> Signer --> HTTP
    HTTP -->|Send Webhook| DestA
    HTTP -->|Send Webhook| DestB
    DestA -->|2xx Success| Worker
    Worker -->|Update Status: delivered| PG

    DestB -->|5xx Failure| RetryEng
    RetryEng -->|Publish with TTL| QRet
    QRet -.->|TTL Expires -> DLX Route| Ex
```

---

## 2. Core Architectural Principles

### Principle 1: PostgreSQL is the System of Record; RabbitMQ is the Execution Mechanism
- **The database is always written first.** Zyvan will never acknowledge an event (`202 Accepted`) to the user unless the event and delivery records have been committed to PostgreSQL.
- If RabbitMQ goes down after a database commit, no event is ever lost — the delivery remains in `queued` state in PostgreSQL and can be reconciled.
- The queue job payload only carries lightweight IDs: `{ deliveryId, eventId }`. The worker loads fresh state from PostgreSQL, ensuring all checks reflect the latest configuration (e.g., if a destination was paused while the job was in transit).

### Principle 2: Idempotency is Enforced at the Database Level
- Instead of relying on in-memory caches or Redis keys that might expire or get lost during restarts, Zyvan enforces uniqueness with a composite database constraint:
  ```sql
  UNIQUE(project_id, idempotency_key)
  ```
- If a client resends the same event due to a network glitch, the database blocks duplicate insertion and Zyvan safely returns the existing event record with `200 OK` (deduplicated).

### Principle 3: Attempt History is Strictly Immutable
- An **Attempt** represents a physical HTTP call made to the outside world.
- When an event is retried or replayed, historical attempts are **never updated or deleted**. New attempts are appended. This allows engineers to reconstruct the exact timeline of what happened during an incident.

---

## 3. RabbitMQ Delayed Retry Architecture (TTL + DLX)

Instead of running slow background cron jobs that poll the database every second (`SELECT * FROM deliveries WHERE next_retry_at <= NOW()`), Zyvan uses native RabbitMQ primitives for sub-second precision and zero polling overhead.

### How It Works:
1. When a delivery encounters a transient failure (e.g., HTTP 500 or timeout), the **Retry Service** calculates an exponential backoff delay with jitter (e.g., 4,250 ms).
2. The worker marks the delivery as `status: 'retrying'` and publishes the job to `zyvan.delivery.retry` with a per-message TTL (`expiration: "4250"`).
3. The message sits in the retry queue until the timer expires. No worker consumes from this queue.
4. When the TTL expires, RabbitMQ automatically dead-letters the message to the Dead-Letter Exchange (`zyvan.events`) with routing key `delivery.process`.
5. The message lands back in `zyvan.delivery`, where an available worker picks it up for the next attempt.

```mermaid
sequenceDiagram
    autonumber
    participant W as Zyvan Worker
    participant DB as PostgreSQL
    participant QR as zyvan.delivery.retry
    participant EX as zyvan.events (Exchange)
    participant QD as zyvan.delivery (Main Queue)

    Note over W: Delivery attempt #1 returns HTTP 500
    W->>W: Calculate backoff: delay = 4,000ms
    W->>DB: UPDATE delivery SET status = 'retrying', attempt_count = 1
    W->>QR: Send message with TTL = 4000ms
    Note over QR: Message sits idle for 4 seconds...
    QR-->>EX: TTL Expired -> Dead-Letter Exchange routes message
    EX->>QD: Routing key 'delivery.process' places job back in queue
    QD->>W: Worker consumes attempt #2
```

---

## 4. Multi-Tenant Isolation

A project can have hundreds of independent tenants (e.g., Tenant A = Shopify Store 1, Tenant B = Shopify Store 2).

Without multi-tenant protection, a spike of 10,000 events from Tenant A could saturate all worker capacity, starving Tenant B. Zyvan prevents this through:
- **Tenant Concurrency Limits**: The maximum number of simultaneous HTTP delivery connections allowed per tenant.
- **Tenant Rate Limits**: The maximum events/second allowed per tenant.
- **Destination Rate Limits**: Outbound limits to prevent overwhelming destination servers.
- **Status Pausing**: Individual tenants or destinations can be paused (`status = 'paused'`) without dropping queued work. Messages wait safely until resumed.
