# Zyvan — Technology Stack & Architecture Rationale

This document explains the technical choices powering Zyvan and why each tool was selected over alternative options.

---

## 1. Technology Overview

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Runtime & Language** | Node.js 20+ & TypeScript 5.7 | High-performance asynchronous execution with strict type safety |
| **API Framework** | Express.js 4.21 | Lightweight, battle-tested HTTP server |
| **Database** | PostgreSQL 16 | ACID-compliant system of record for all events, deliveries, and keys |
| **ORM & Migrations** | Prisma 6.8 | Type-safe queries, schema management, and transactional guarantees |
| **Message Broker** | RabbitMQ 3.13 (AMQP 0-9-1) | Durable queueing, prefetch concurrency, and TTL+DLX delayed retries |
| **Validation** | Zod 3.24 | Runtime schema validation across API and Worker |
| **Security & Crypto** | Node.js `crypto` | AES-256-GCM encryption, HMAC-SHA256 signing, `timingSafeEqual` |
| **Logging** | Pino 9.6 | High-throughput structured JSON logging with automatic secret redaction |
| **Testing** | Vitest 3.1 & Supertest 7.0 | Fast parallel unit and integration testing |
| **Containers** | Docker & Docker Compose | Local multi-service development environment |

---

## 2. Deep Dive: Architecture Decisions & Rationale

### 2.1 PostgreSQL as the System of Record
- **Why?** Webhook delivery platforms require strict durability and data integrity. If a server loses power mid-request, an accepted event cannot simply disappear.
- **Alternatives considered**:
  - *MongoDB / Document DB*: Lacks native multi-table transactional guarantees with enforced relational foreign keys.
  - *Redis as primary store*: In-memory storage risks data loss during memory pressure, restarts, or snapshot delays.
- **Decision**: PostgreSQL provides composite unique constraints (`UNIQUE(project_id, idempotency_key)`), ACID transactions for atomic multi-delivery creation, and durable indexes for cursor pagination.

### 2.2 RabbitMQ for Delivery & Retry Queues
- **Why?** RabbitMQ is purpose-built for reliable asynchronous message passing and task distribution:
  - **Manual Acknowledgments (`noAck: false`)**: If a worker node crashes mid-delivery, the unacknowledged message is automatically placed back into the queue for another worker.
  - **Bounded Concurrency (`prefetch`)**: Workers pull exactly the number of jobs they can process simultaneously, preventing worker node overload.
  - **TTL + Dead-Letter Exchange (DLX) for Retries**: Instead of continuous polling loops (`SELECT * FROM deliveries WHERE retry_at <= NOW()`), RabbitMQ natively holds messages in a retry queue with a millisecond TTL. When the timer expires, RabbitMQ moves the message back to the active queue with zero CPU polling overhead.
- **Alternatives considered**:
  - *Kafka*: Designed for append-only streaming and log partitioning, but overly complex for individual message acknowledgments, point-to-point task queues, and variable delayed retries.
  - *BullMQ / Redis*: Good for basic job queues, but lacks AMQP native routing topologies and robust per-message TTL dead-letter exchanges without Redis Lua script overhead.

### 2.3 Cryptography & Security Primitives

#### 1. AES-256-GCM for Secrets at Rest
- Destination signing secrets are encrypted before being written to PostgreSQL.
- AES-256-GCM provides authenticated encryption with an initialization vector (IV) and authentication tag. If ciphertext is tampered with, decryption fails immediately.

#### 2. HMAC-SHA256 Webhook Signatures
- Outbound webhooks include:
  ```http
  X-Zyvan-Signature: v1=a94a8fe5ccb19ba61c4c0873d391e987982fbbd3
  X-Zyvan-Timestamp: 1788342416
  X-Zyvan-Delivery-Id: del_01J...
  X-Zyvan-Event-Id: evt_01J...
  ```
- Signed content: `${timestamp}.${raw_payload}` using the destination's secret.
- Constant-time verification (`crypto.timingSafeEqual`) prevents timing side-channel attacks.

#### 3. True SSRF Protection (Server-Side Request Forgery)
- Naive solutions check `url.includes("localhost")`. Attackers bypass this with DNS rebinding or alternate representations (`127.0.0.1`, `0.0.0.0`, `http://169.254.169.254`).
- Zyvan performs **actual DNS resolution** before saving destination URLs and blocks:
  - Loopback (`127.0.0.0/8`, `::1`)
  - Private IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
  - Cloud metadata addresses (`169.254.169.254`, Google/AWS metadata endpoints)
  - Broadcast and link-local ranges

### 2.4 Structured JSON Logging & Automatic Secret Redaction
- Powered by **Pino**, the fastest Node.js logger.
- Automatically redacts sensitive fields before writing logs to stdout:
  ```json
  "redact": {
    "paths": ["secret", "password", "apiKey", "*.secret", "req.headers.authorization"]
  }
  ```
- Ensures customer webhook secrets and bearer tokens never leak to log management systems (Datadog, CloudWatch, etc.).
