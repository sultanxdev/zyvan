# Zyvan

> Webhook reliability infrastructure for durable event delivery, retries, failure recovery, replay, and delivery observability.

Zyvan sits between an application and its webhook destinations.

It accepts events, persists them, processes delivery asynchronously, retries transient failures, records delivery attempts, and provides recovery paths when destinations remain unavailable.

**Core workflow**

`Receive → Persist → Queue → Deliver → Retry → Recover → Replay`

## Why Zyvan?

Webhook delivery becomes difficult when a destination:

- Times out
- Returns 5xx responses
- Goes offline
- Recovers after an outage
- Receives duplicate events
- Processes events slower than they are produced

A reliable webhook system needs durable state, idempotency, retries, failure recovery, replay, delivery history, and secure outbound requests.

Zyvan is being built to provide that reliability layer.

## How It Works

`Application → Zyvan API → Persist → Queue → Delivery Worker → Destination`

When delivery keeps failing:

`Failure → Retry → Retry → Dead Letter → Replay`

## Architecture

```text
Client
  ↓
Fastify API
  ↓
PostgreSQL
  ↓
RabbitMQ
  ↓
Delivery Worker
  ↓
Webhook Destination
```

PostgreSQL acts as the durable source of event state, while asynchronous workers handle delivery processing.

## Core Reliability Model

### Durable Ingestion

Accepted events are persisted before asynchronous delivery processing so worker failures do not make event state unrecoverable.

### Idempotency

The system treats duplicate processing as an expected distributed-systems problem and uses idempotency to make retries safer.

### Retries

Transient failures are retried with controlled backoff and jitter rather than immediately repeating requests.

### Dead-Letter Recovery

Events that continue to fail are separated from the normal delivery path so they can be inspected and replayed after the destination problem is fixed.

### Delivery History

Delivery attempts record enough information to understand what happened during an event's lifecycle.

## Multi-Tenant Architecture

Zyvan is designed as a multi-tenant platform.

`Organization → Projects → Destinations → Events → Deliveries → Attempts`

Tenant boundaries are enforced by the backend across organization-owned resources.

The platform also models tenant-aware rate and concurrency controls.

## Security

Outbound destinations are treated as a security boundary.

Zyvan includes:

- Authentication
- Authorization
- Project API keys
- Tenant isolation
- HMAC signing
- SSRF protection
- Secret protection
- Audit logging

## Event Lifecycle

`Received → Persisted → Queued → Delivering → Delivered`

Failure path:

`Delivering → Retrying → Dead Letter → Replay`

## Dashboard

The web application is designed around operational visibility:

- Projects
- Destinations
- Events
- Deliveries
- Attempts
- Failures
- Replay
- Usage
- Settings

The goal is to make webhook failures understandable and recoverable without manually reconstructing them from application logs.

## API

Core resources include:

```text
/v1/events
/v1/projects
/v1/tenants
/v1/destinations
```

The public API handles event ingestion and platform configuration while workers handle asynchronous delivery.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, React |
| Language | TypeScript |
| API | Node.js, Fastify |
| Database | PostgreSQL |
| ORM | Prisma |
| Queue | RabbitMQ |
| Supporting Infrastructure | Redis |
| UI | Tailwind CSS, shadcn/ui |
| Deployment | Docker |

## Project Structure

```text
zyvan/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
├── packages/
│   ├── sdk-node/
│   ├── schemas/
│   └── crypto/
├── docs/
├── tests/
└── package.json
```

## Local Development

### Requirements

- Node.js
- pnpm
- PostgreSQL
- Redis
- RabbitMQ
- Docker

### Installation

```bash
git clone https://github.com/sultanxdev/zyvan.git
cd zyvan
pnpm install
```

Start infrastructure:

```bash
docker compose up -d
```

Start development:

```bash
pnpm dev
```

### Useful Commands

```bash
pnpm typecheck
pnpm test
pnpm build
```

Use the repository's `.env.example` files for configuration.

## Reliability Testing

Important scenarios include:

- Duplicate events
- Destination failures
- Worker crashes
- Queue backlogs
- Retry recovery
- Dead-letter handling
- Replay
- Tenant isolation
- Unsafe destinations

The focus is on system behavior when dependencies fail, not only on the successful request path.

## Design Principles

1. PostgreSQL is the durable source of event state.
2. Delivery is asynchronous.
3. Retries use controlled backoff.
4. Failed events remain recoverable.
5. Tenant boundaries are enforced by the backend.
6. Security is part of the delivery pipeline.

## Project Status

**Active Development**

Current focus:

`Receive → Persist → Queue → Deliver → Retry → Recover → Replay`

> **Send the event. Zyvan handles what happens next.**

## Links

- Website: https://www.zyvan.dev
- Portfolio: https://www.sultanx.dev/projects/zyvan
