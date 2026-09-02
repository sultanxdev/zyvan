# Zyvan — Class & Sequence Diagrams

This document illustrates the module dependencies and step-by-step lifecycles of events in Zyvan using UML and Mermaid sequence diagrams.

---

## 1. Class & Module Architecture

Zyvan follows a modular, layer-separated architecture:
- **Controllers**: Parse HTTP requests and invoke services.
- **Services**: Contain pure business logic (SSRF, idempotency, retry, signing).
- **Repositories**: Encapsulate Prisma database access.
- **Queue/Client Libraries**: Handle RabbitMQ and external HTTP communication.

```mermaid
classDiagram
    class EventController {
        +createEvent(req, res)
        +getEvent(req, res)
        +listEvents(req, res)
    }

    class EventService {
        +ingestEvent(projectId, tenantId, type, key, data, headers)
        +getEvent(id, projectId)
        +listEvents(projectId, filters)
    }

    class EventRepository {
        +createWithDeliveries(data, destinationIds)
        +findByIdempotencyKey(projectId, key)
        +findById(id, projectId)
        +listWithFilters(filters)
        +updateStatus(id, status)
    }

    class RabbitMQManager {
        +connectRabbitMQ()
        +publishDeliveryJob(job)
        +publishRetryJob(job, delayMs)
        +isRabbitMQConnected()
    }

    class DeliveryService {
        +processDelivery(job, encryptionKey, hmacVersion, logger)
        +moveToDLQ(deliveryId, eventId, reason, prisma)
    }

    class HttpClient {
        +sendWebhook(request)
    }

    class RetryService {
        +classifyFailure(outcome, statusCode)
        +shouldRetry(attemptCount, policy)
        +calculateBackoff(attemptNo, policy)
    }

    class AttemptService {
        +createAttempt(data)
        +completeAttempt(id, result)
    }

    EventController --> EventService : delegates to
    EventService --> EventRepository : persists state
    EventService --> RabbitMQManager : enqueues delivery

    DeliveryService --> HttpClient : sends webhook
    DeliveryService --> AttemptService : logs immutable attempt
    DeliveryService --> RetryService : calculates backoff
    DeliveryService --> RabbitMQManager : schedules retry
```

---

## 2. Sequence Diagram 1: Event Ingestion & Idempotency Pipeline

When an application calls `POST /v1/events`:
1. The API checks the bearer token and permissions.
2. The idempotency key is checked against the database.
3. If duplicate: returns the existing event with `200 OK` (no new job is queued).
4. If new: commits the event and delivery records in an atomic PostgreSQL transaction.
5. Publishes delivery jobs to RabbitMQ.
6. Returns `202 Accepted` to the caller.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Customer App
    participant API as Zyvan API Server
    participant DB as PostgreSQL
    participant MQ as RabbitMQ (zyvan.events)

    Client->>API: POST /v1/events<br/>{ idempotency_key: "ord_123", type: "order.created" }
    API->>API: 1. Authenticate Bearer Key & check 'events:write' scope
    API->>API: 2. Validate payload schema with Zod
    API->>DB: 3. Check idempotency: findByIdempotencyKey(ord_123)
    
    alt Event already exists (Duplicate request)
        DB-->>API: Return existing Event record
        API-->>Client: HTTP 200 OK { event_id: "evt_1", status: "queued", duplicate: true }
    else New Event
        DB-->>API: Not found
        API->>DB: 4. BEGIN TRANSACTION<br/>INSERT Event + INSERT Deliveries (for each active destination)
        DB-->>API: COMMIT SUCCESS
        API->>MQ: 5. Publish DeliveryJob { deliveryId, eventId }
        API-->>Client: HTTP 202 Accepted { event_id: "evt_1", status: "queued", duplicate: false }
    end
```

---

## 3. Sequence Diagram 2: Worker Webhook Delivery & Attempt Tracking

When an event is ready for delivery:
1. The worker pulls the delivery job from RabbitMQ.
2. It fetches the event payload and destination details from PostgreSQL.
3. Decrypts the destination's signing secret using AES-256-GCM.
4. Computes an HMAC-SHA256 signature and attaches `X-Zyvan-*` headers.
5. Starts an immutable `Attempt` record in the database.
6. Sends the HTTP POST request to the customer destination.
7. On `2xx Success`: completes the attempt record, marks the delivery as `delivered`, and acknowledges the message in RabbitMQ.

```mermaid
sequenceDiagram
    autonumber
    participant MQ as RabbitMQ (zyvan.delivery)
    participant W as Worker Consumer
    participant DB as PostgreSQL
    participant Dest as Destination Server

    MQ->>W: Pull message: { deliveryId: "del_1", eventId: "evt_1" }
    W->>DB: 1. Fetch delivery, event, and destination
    W->>W: 2. Decrypt secret using AES-256-GCM
    W->>W: 3. Sign payload: HMAC-SHA256(secret, timestamp + "." + payload)
    W->>DB: 4. Create Attempt #1 (started_at = now)
    
    W->>Dest: 5. HTTP POST /webhook<br/>Headers: X-Zyvan-Signature, X-Zyvan-Timestamp, etc.
    Dest-->>W: HTTP 200 OK (latency: 180ms)
    
    W->>DB: 6. Complete Attempt #1 (statusCode = 200, outcome = 'success', latency = 180ms)
    W->>DB: 7. UPDATE Delivery SET status = 'delivered'
    W->>MQ: 8. ack(message)
```

---

## 4. Sequence Diagram 3: Transient Failure & Delayed Retry Flow

When a destination returns HTTP 500 or times out:
1. The failure is classified as **retryable**.
2. Exponential backoff with random jitter is calculated.
3. The delivery status is updated to `retrying` with `next_retry_at`.
4. The job is published to `zyvan.delivery.retry` with a per-message TTL.
5. When the TTL expires, RabbitMQ automatically routes the job back to `zyvan.delivery` via the Dead-Letter Exchange.
6. The worker picks it up for the next attempt.

```mermaid
sequenceDiagram
    autonumber
    participant MQ as zyvan.delivery
    participant W as Worker
    participant Dest as Destination Server
    participant DB as PostgreSQL
    participant MQR as zyvan.delivery.retry (TTL)

    MQ->>W: Job { deliveryId: "del_1", attempt: 1 }
    W->>Dest: HTTP POST /webhook
    Dest-->>W: HTTP 500 Internal Server Error
    
    W->>DB: 1. Complete Attempt #1 (outcome: 'failed', statusCode: 500)
    W->>W: 2. Classify: 500 is retryable
    W->>W: 3. Calculate backoff: delay = 4,500 ms (exponential + jitter)
    W->>DB: 4. UPDATE Delivery SET status = 'retrying', next_retry_at = now() + 4.5s
    W->>MQR: 5. Publish to retry queue with TTL = 4500ms
    W->>MQ: 6. ack(original message)
    
    Note over MQR: Message waits 4.5 seconds...
    MQR-->>MQ: 7. TTL Expired -> DLX re-queues to zyvan.delivery
    MQ->>W: 8. Worker picks up Attempt #2
```

---

## 5. Sequence Diagram 4: Dead Letter Queue (DLQ) & Safe Replay

When all retries are exhausted (or a 4xx terminal error occurs):
1. The delivery enters the **Dead Letter Queue (DLQ)**.
2. An engineer inspects the failed event and attempts via the Zyvan dashboard or API.
3. The engineer calls `POST /v1/events/:id/replay`.
4. Zyvan creates a **new** Delivery and a linked Replay record.
5. The original attempt history is untouched.
6. The new delivery job is enqueued to RabbitMQ for execution.

```mermaid
sequenceDiagram
    autonumber
    actor Eng as Engineer / Dashboard
    participant API as Zyvan API
    participant DB as PostgreSQL
    participant MQ as RabbitMQ
    participant W as Worker

    Note over DB: Delivery del_1 exhausted all 5 attempts
    Note over DB: DeadLetter record created (status = 'dead_letter')
    
    Eng->>API: GET /v1/dead-letters
    API->>DB: Fetch failed deliveries + full attempt logs
    DB-->>API: Return failure reasons and attempt timelines
    API-->>Eng: Display failed event in DLQ
    
    Eng->>API: POST /v1/events/evt_1/replay
    API->>DB: 1. BEGIN TRANSACTION
    API->>DB: 2. Create NEW Delivery del_2 (status: 'queued', attempt_count: 0)
    API->>DB: 3. Create Replay record linking evt_1 -> del_2
    API->>DB: 4. COMMIT (Historical attempts on del_1 remain unchanged)
    API->>MQ: 5. Publish DeliveryJob { deliveryId: "del_2", eventId: "evt_1" }
    API-->>Eng: HTTP 202 Accepted { replay_id: "rep_1", delivery_id: "del_2" }
    
    MQ->>W: Consume del_2 -> fresh attempt lineage begins
```
