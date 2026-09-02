# Zyvan — Reliable Webhook & Event Delivery Infrastructure

> Multi-tenant webhook reliability engine that durably accepts events, asynchronously delivers them with retry and tenant-aware controls, records complete delivery history, and provides DLQ, replay, security and operational debugging.

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### 1. Start Infrastructure
```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`
- **RabbitMQ** on port `5672` (Management UI: `http://localhost:15672`)

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Database Migrations
```bash
npm run db:generate
npm run db:migrate
```

### 4. Start Development Servers
```bash
# Terminal 1 — API Server
npm run dev:api

# Terminal 2 — Worker
npm run dev:worker
```

The API will be available at `http://localhost:4000`.

### 5. Verify
```bash
# Health check
curl http://localhost:4000/health

# Readiness check
curl http://localhost:4000/ready

# API info
curl http://localhost:4000/v1
```

## Documentation

Comprehensive guides, diagrams, and specifications are located in the [`docs/`](docs/README.md) directory:

- [System Architecture](docs/architecture.md) — High-level design, RabbitMQ TTL + DLX delayed retry flow.
- [Entity-Relationship (ER) Diagram](docs/er-diagram.md) — PostgreSQL models, constraints, and tables.
- [Class & Sequence Diagrams](docs/class-and-sequence.md) — Ingestion, delivery, retry, and replay lifecycles.
- [Technology Stack & Rationale](docs/tech-stack.md) — Technical justifications and trade-offs.
- [API Reference](docs/api.md) — Complete endpoint documentation and request/response contracts.

## Architecture

```
Customer Application
        │
        ▼
   Zyvan API (Express.js)
   Auth / Validation / Idempotency
        │
   Persist first
        │
        ▼
   PostgreSQL (Source of Truth)
        │
   Queue Job
        │
        ▼
   RabbitMQ (Execution Layer)
        │
        ▼
   Workers (Retry / Rate Limit / HMAC)
        │
        ▼
   Customer Endpoint
   │          │
  2xx     4xx/5xx/Timeout
   │          │
   ▼          ▼
 Delivered   Retry → DLQ → Replay
```

## Project Structure

```
zyvan/
├── apps/
│   ├── api/           # Express.js API server
│   ├── worker/        # RabbitMQ delivery worker
│   └── web/           # Next.js frontend (Phase 7+)
├── packages/
│   ├── database/      # Prisma schema & client
│   ├── schemas/       # Shared Zod validation schemas
│   └── crypto/        # HMAC, encryption, SSRF utilities
├── docker-compose.yml
├── package.json
└── README.md
```

## Technology Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + TypeScript + Express.js |
| Database | PostgreSQL (Prisma ORM) |
| Queue | RabbitMQ |
| Cache | Redis |
| Security | HMAC-SHA256, AES-256-GCM, SSRF Protection |

## License

MIT
