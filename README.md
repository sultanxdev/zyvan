# Zyvan — Reliable Webhook & Event Delivery Infrastructure

> Multi-tenant webhook reliability engine that durably ingests events, asynchronously delivers them with exponential retry and tenant-aware concurrency controls, preserves an immutable delivery audit ledger, and provides Dead-Letter Queue (DLQ) recovery, manual replay, and end-to-end cryptographic signatures.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black.svg)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.13-orange.svg)](https://www.rabbitmq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🚀 Key Highlights & Engineering Features

- **Dual-Layer Ingestion Reliability**: PostgreSQL acts as the durable system of record, committing events and delivery intents transactionally before any job is enqueued to RabbitMQ. Zero event loss on worker or broker failure.
- **Strict Idempotency Deduplication**: Unique constraint indexing (`project_id`, `idempotency_key`) prevents duplicate executions from network retries, responding with HTTP 200 OK without re-triggering webhook dispatches.
- **RabbitMQ TTL + DLX Delayed Retries**: Retries are scheduled via RabbitMQ per-message time-to-live (TTL) and Dead Letter Exchange (DLX) routing. Workers consume delayed messages without database polling.
- **Tenant Isolation & Noisy-Neighbor Mitigation**: Tenant-scoped rate limits and concurrency caps prevent one high-volume customer from consuming overall cluster capacity.
- **Cryptographic Security**: Endpoint secrets are symmetrically encrypted at rest with AES-256-GCM. Outbound webhooks include timestamped HMAC-SHA256 signatures (`Zyvan-Signature: t=...,v1=...`) with built-in SSRF protection.
- **Full Observability & Dead-Letter Recovery**: An interactive Next.js 16 dashboard provides live latency percentiles (P50/P95/P99), immutable attempt histories with HTTP response snapshots, and one-click DLQ replay.
- **Dual Authentication**: Session JWT authentication for developer dashboard users alongside scoped Bearer API keys (`zyvan_live_...`) with peppered SHA-256 hashing for machine-to-machine event ingestion.

---

## 📐 Architecture Diagram

```
 Customer App / Webhook Producer
                │
                ▼
       ┌─────────────────┐
       │   Zyvan API     │ ◄── [Bearer API Key or User JWT Auth]
       │  (Express.js)   │
       └────────┬────────┘
                │
        Durable Transaction
                │
                ▼
       ┌─────────────────┐
       │   PostgreSQL    │ (System of Record: Events, Deliveries, Attempts, DLQ)
       └────────┬────────┘
                │
         Publish Intent
                │
                ▼
       ┌─────────────────┐
       │    RabbitMQ     │ (Execution Layer: zyvan.events Topic Exchange)
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │  Delivery Worker│ (Prefetch, AES-256-GCM Secret Decryption, HMAC-SHA256)
       └────────┬────────┘
                │
                ├───────────────────────────────────────────┐
                │ HTTP POST                                 │ HTTP 4xx/5xx/Timeout
                ▼                                           ▼
      Customer Webhook Endpoint                   Exponential Backoff
          (200 OK Delivered)                         │ (TTL Queue + DLX)
                                                     ▼
                                          Exhausted Attempts (Max Retries)
                                                     │
                                                     ▼
                                            Dead-Letter Queue (DLQ)
                                                     │
                                                     ▼
                                            Manual Replay Lineage
```

---

## 💻 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 20+
- Docker & Docker Compose

### 2. Start Supporting Infrastructure
```bash
# Start PostgreSQL (5432), Redis (6379), RabbitMQ (5672, UI: 15672)
docker compose up -d
```

### 3. Install Dependencies & Seed Database
```bash
npm install

# Generate Prisma Client & push schema
npm run db:generate
npm run db:push

# Seed demo user, default project, sample destinations, and realistic events
npm run db:seed
```

### 4. Start Development Servers
Run the 3 components in separate terminals (or concurrently):
```bash
# Terminal 1 — Express Ingestion API (Port 4000)
npm run dev:api

# Terminal 2 — RabbitMQ Delivery Worker
npm run dev:worker

# Terminal 3 — Next.js Dashboard & Simulator (Port 3000)
npm run dev:web
```

Visit the dashboard at `http://localhost:3000`. Use **Quick Demo Login** (`developer@zyvan.dev` / `zyvan_secure_2026`) or sign up with a new account.

---

## ☁️ Deploying to AWS

Zyvan includes multi-stage production Dockerfiles and an AWS deployment guide:

- **[Complete AWS Deployment Guide](DEPLOYMENT_AWS.md)**: Instructions for AWS EC2 (Docker Compose + Nginx + Let's Encrypt SSL) and AWS ECS Fargate + Amazon RDS + Amazon MQ.
- **Production Compose**:
  ```bash
  docker compose -f docker-compose.prod.yml up -d --build
  ```

---

## 🧪 Testing & Verification

Run automated tests across all monorepo packages:

```bash
# Run all unit test suites
npm test

# Run specific workspace tests
npm run test:unit --workspace=apps/api
npm run test:unit --workspace=apps/worker
npm run test --workspace=packages/crypto
```

---

## 💼 Resume Description & Bullet Points

```
Zyvan — Multi-Tenant Webhook & Event Delivery Infrastructure
Technologies: Node.js, TypeScript, Express.js, Next.js 16, PostgreSQL, Prisma, RabbitMQ, Redis, Docker, AWS

• Architected a distributed, fault-tolerant webhook delivery platform guaranteeing at-least-once delivery using PostgreSQL as the system of record and RabbitMQ for asynchronous dispatch.
• Implemented composite database idempotency keys and transactional outbox patterns, eliminating duplicate event processing under high concurrency.
• Designed exponential backoff with full jitter using RabbitMQ message TTL and Dead Letter Exchanges (DLX), removing database polling overhead for retries.
• Engineered multi-tenant concurrency caps and rate limiters to protect shared worker resources against noisy-neighbor starvation.
• Secured webhook payloads with AES-256-GCM encrypted signing secrets and HMAC-SHA256 timestamped signatures to prevent replay attacks and SSRF vulnerabilities.
• Built a Next.js observability dashboard rendering real-time delivery latency percentiles (P50/P95/P99), attempt timelines, and single-click dead-letter replay.
```

---

## 📄 License

MIT License. Copyright (c) 2026 Zyvan.
