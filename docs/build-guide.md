# 🚀 Zyvan — Step-by-Step Build Guide (Zero to Production)

> **Read this before writing any code.**
> This guide tells you exactly what to build, in what order, and why.
> Follow the phases in sequence — each phase builds on the previous one.

---

## Build Order Overview

```
Phase 0 → Project Setup & Tooling
Phase 1 → Backend: Database & Schema
Phase 2 → Backend: Ingest API (Core)
Phase 3 → Backend: Dispatcher Workers
Phase 4 → Backend: Retry, DLQ & Replay
Phase 5 → Backend: Security Layer
Phase 6 → Backend: Observability
Phase 7 → Frontend: Dashboard (Next.js)
Phase 8 → Infra: Docker & Deployment
Phase 9 → Testing & Load Validation
```

> ⚠️ **Build backend first — always.**
> The frontend dashboard is purely a UI on top of the backend API.
> There is nothing to display until the engine works.

---

## Phase 0 — Project Setup & Tooling

**Goal:** Get a working monorepo with all tooling in place before writing business logic.

### Step 0.1 — Initialize the Monorepo

```bash
mkdir zyvan && cd zyvan
git init
npm init -y
```

Create the folder structure:
```bash
mkdir -p server/src/{api,core,workers,models,middleware,config}
mkdir -p server/tests
mkdir -p client
mkdir -p docs/assets
mkdir -p infra
```

### Step 0.2 — Setup the Server Package

```bash
cd server
npm init -y
npm install express zod ioredis bullmq pg dotenv
npm install -D typescript ts-node nodemon @types/express @types/node @types/pg
npx tsc --init
```

Configure `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### Step 0.3 — Setup Docker Compose (Local Infra)

Create `docker-compose.yml` in root:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: zyvan
      POSTGRES_PASSWORD: zyvan_secret
      POSTGRES_DB: zyvan_db
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pg_data:
```

```bash
docker-compose up -d
```

### Step 0.4 — Setup Environment Variables

Create `server/.env`:
```env
PORT=3000
DATABASE_URL=postgresql://zyvan:zyvan_secret@localhost:5432/zyvan_db
REDIS_URL=redis://localhost:6379
API_KEY_SECRET=change_this_in_production
```

Create `server/src/config/env.ts`:
```ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL!,
};

// Fail fast if required vars missing
if (!config.databaseUrl) throw new Error('DATABASE_URL is required');
if (!config.redisUrl) throw new Error('REDIS_URL is required');
```

**✅ Phase 0 done when:** `docker-compose up -d` runs, server starts with `npm run dev` without errors.

---

## Phase 1 — Backend: Database & Schema

**Goal:** Define the complete data model and get migrations running.

### Step 1.1 — Install ORM (Prisma recommended)

```bash
cd server
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

### Step 1.2 — Define the Schema

Edit `server/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum EventStatus {
  RECEIVED
  DISPATCHING
  DELIVERED
  RETRY_SCHEDULED
  DEAD_LETTERED
}

model Endpoint {
  id            String   @id @default(uuid())
  url           String
  signingSecret String
  maxRetries    Int      @default(5)
  timeoutMs     Int      @default(30000)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  events        Event[]
}

model Event {
  id              String          @id @default(uuid())
  idempotencyKey  String          @unique
  endpointId      String
  endpoint        Endpoint        @relation(fields: [endpointId], references: [id])
  eventType       String
  payload         Json
  metadata        Json?
  status          EventStatus     @default(RECEIVED)
  failureReason   String?
  retryCount      Int             @default(0)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  attempts        DeliveryAttempt[]

  @@index([idempotencyKey])
  @@index([status])
  @@index([endpointId, createdAt(sort: Desc)])
}

model DeliveryAttempt {
  id            String   @id @default(uuid())
  eventId       String
  event         Event    @relation(fields: [eventId], references: [id])
  attemptNumber Int
  httpStatus    Int?
  responseBody  String?
  responseHeaders Json?
  latencyMs     Int?
  errorMessage  String?
  attemptedAt   DateTime @default(now())
}

model ApiKey {
  id         String    @id @default(uuid())
  keyHash    String    @unique
  prefix     String
  isActive   Boolean   @default(true)
  createdAt  DateTime  @default(now())
  lastUsedAt DateTime?
}
```

### Step 1.3 — Run Migration

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Step 1.4 — Create DB Client

Create `server/src/config/db.ts`:
```ts
import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient({
  log: ['error', 'warn'],
});
```

**✅ Phase 1 done when:** `npx prisma studio` opens and shows your tables with correct columns.

---

## Phase 2 — Backend: Ingest API

**Goal:** Build the `POST /v1/events` endpoint — the core of Zyvan.

### Step 2.1 — Create the Express App

Create `server/src/index.ts`:
```ts
import express from 'express';
import { config } from './config/env';
import { eventRouter } from './api/events/route';

const app = express();
app.use(express.json({ limit: '512kb' }));

// Routes
app.use('/v1/events', eventRouter);
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Global error handler
app.use((err: Error, req: any, res: any, next: any) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`Zyvan running on port ${config.port}`);
});
```

### Step 2.2 — API Key Auth Middleware

Create `server/src/middleware/auth.ts`:
```ts
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../config/db';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-api-key'] as string;
  if (!key) return res.status(401).json({ error: 'Missing API key' });

  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const apiKey = await db.apiKey.findUnique({ where: { keyHash: hash } });

  if (!apiKey || !apiKey.isActive) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Update last used (fire and forget)
  db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  next();
}
```

### Step 2.3 — Request Validation

Create `server/src/api/events/validator.ts`:
```ts
import { z } from 'zod';

export const IngestEventSchema = z.object({
  endpoint_id: z.string().uuid(),
  event_type: z.string().min(1).max(100),
  payload: z.record(z.unknown()),
  metadata: z.record(z.unknown()).optional(),
});

export type IngestEventInput = z.infer<typeof IngestEventSchema>;
```

### Step 2.4 — Ingest Service (Core Logic)

Create `server/src/core/ingest.ts`:
```ts
import { db } from '../config/db';
import { queue } from '../config/queue';
import { IngestEventInput } from '../api/events/validator';

export async function ingestEvent(input: IngestEventInput, idempotencyKey: string) {
  // Check idempotency + insert in a transaction
  return await db.$transaction(async (tx) => {
    // Check if key already exists
    const existing = await tx.event.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      return { event: existing, isNew: false };
    }

    // Verify endpoint exists
    const endpoint = await tx.endpoint.findUnique({
      where: { id: input.endpoint_id, isActive: true },
    });

    if (!endpoint) throw new Error('ENDPOINT_NOT_FOUND');

    // Insert new event
    const event = await tx.event.create({
      data: {
        idempotencyKey,
        endpointId: input.endpoint_id,
        eventType: input.event_type,
        payload: input.payload,
        metadata: input.metadata,
        status: 'RECEIVED',
      },
    });

    return { event, isNew: true };
  });
}

// Called AFTER transaction commits — outside the tx
export async function enqueueEvent(eventId: string) {
  await queue.add('dispatch', { eventId }, { jobId: eventId });
}
```

### Step 2.5 — Event Route & Controller

Create `server/src/api/events/route.ts`:
```ts
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { IngestEventSchema } from './validator';
import { ingestEvent, enqueueEvent } from '../../core/ingest';
import { db } from '../../config/db';

export const eventRouter = Router();
eventRouter.use(authMiddleware);

// POST /v1/events — ingest
eventRouter.post('/', async (req: Request, res: Response) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header is required' });
  }

  const parsed = IngestEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  try {
    const { event, isNew } = await ingestEvent(parsed.data, idempotencyKey);

    if (isNew) {
      await enqueueEvent(event.id);
      return res.status(202).json({ event_id: event.id, status: 'accepted' });
    } else {
      return res.status(200).json({ event_id: event.id, status: 'already_accepted' });
    }
  } catch (err: any) {
    if (err.message === 'ENDPOINT_NOT_FOUND') {
      return res.status(404).json({ error: 'Endpoint not found or inactive' });
    }
    throw err;
  }
});

// GET /v1/events/:id — get event + attempts
eventRouter.get('/:id', async (req: Request, res: Response) => {
  const event = await db.event.findUnique({
    where: { id: req.params.id },
    include: { attempts: { orderBy: { attemptNumber: 'asc' } } },
  });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  return res.json(event);
});

// GET /v1/events — list with filter
eventRouter.get('/', async (req: Request, res: Response) => {
  const { status, endpoint_id, limit = '20', offset = '0' } = req.query;
  const events = await db.event.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(endpoint_id && { endpointId: endpoint_id as string }),
    },
    orderBy: { createdAt: 'desc' },
    take: Number(limit),
    skip: Number(offset),
    include: { _count: { select: { attempts: true } } },
  });
  return res.json(events);
});
```

### Step 2.6 — Queue Config

Create `server/src/config/queue.ts`:
```ts
import { Queue } from 'bullmq';
import { config } from './env';

export const queue = new Queue('event-dispatch', {
  connection: { url: config.redisUrl },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
```

**✅ Phase 2 done when:** `POST /v1/events` with valid body returns `202 Accepted` and the event appears in the DB.

---

## Phase 3 — Backend: Dispatcher Workers

**Goal:** Build the background worker that reads from the queue and delivers webhooks.

### Step 3.1 — Dispatcher Worker

Create `server/src/workers/dispatch.ts`:
```ts
import { Worker, Job } from 'bullmq';
import { config } from '../config/env';
import { db } from '../config/db';
import { generateSignature } from '../core/signing';

const DELIVERY_TIMEOUT_MS = 30_000;

export const dispatchWorker = new Worker('event-dispatch', async (job: Job) => {
  const { eventId } = job.data;

  // Load event + endpoint from DB
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { endpoint: true },
  });

  if (!event || !event.endpoint.isActive) return;

  // Mark as dispatching
  await db.event.update({ where: { id: eventId }, data: { status: 'DISPATCHING' } });

  const body = JSON.stringify(event.payload);
  const signature = generateSignature(event.endpoint.signingSecret, body);
  const startTime = Date.now();
  const attemptNumber = event.retryCount + 1;

  let httpStatus: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), event.endpoint.timeoutMs || DELIVERY_TIMEOUT_MS);

    const response = await fetch(event.endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Zyvan-Event-Id': event.id,
        'X-Zyvan-Signature': `sha256=${signature}`,
        'X-Zyvan-Event-Type': event.eventType,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    httpStatus = response.status;
    responseBody = (await response.text()).slice(0, 2048); // cap at 2KB
  } catch (err: any) {
    errorMessage = err.message;
  }

  const latencyMs = Date.now() - startTime;

  // Log the attempt
  await db.deliveryAttempt.create({
    data: {
      eventId,
      attemptNumber,
      httpStatus,
      responseBody,
      latencyMs,
      errorMessage,
    },
  });

  // Determine new state
  const isSuccess = httpStatus && httpStatus >= 200 && httpStatus < 300;
  const isPermanentFailure = httpStatus && httpStatus >= 400 && httpStatus < 500;
  const maxRetries = event.endpoint.maxRetries;

  if (isSuccess) {
    await db.event.update({ where: { id: eventId }, data: { status: 'DELIVERED' } });
  } else if (isPermanentFailure) {
    await db.event.update({
      where: { id: eventId },
      data: { status: 'DEAD_LETTERED', failureReason: `HTTP ${httpStatus}` },
    });
  } else if (event.retryCount >= maxRetries) {
    await db.event.update({
      where: { id: eventId },
      data: { status: 'DEAD_LETTERED', failureReason: errorMessage || `Max retries exceeded` },
    });
  } else {
    // Schedule retry
    const delay = calculateBackoff(event.retryCount);
    await db.event.update({
      where: { id: eventId },
      data: { status: 'RETRY_SCHEDULED', retryCount: { increment: 1 } },
    });
    // BullMQ re-adds the job with a delay
    throw new Error('RETRY'); // Let BullMQ handle retry via config
  }
}, {
  connection: { url: config.redisUrl },
  concurrency: 10,
});

function calculateBackoff(retryCount: number): number {
  const base = 1000;
  const jitter = Math.random() * 500;
  return Math.min(base * Math.pow(2, retryCount) + jitter, 3_600_000);
}

dispatchWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});
```

### Step 3.2 — HMAC Signing Utility

Create `server/src/core/signing.ts`:
```ts
import crypto from 'crypto';

export function generateSignature(secret: string, body: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');
}

export function verifySignature(secret: string, body: string, receivedSig: string): boolean {
  const expected = generateSignature(secret, body);
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(receivedSig, 'hex')
  );
}
```

### Step 3.3 — Start Worker Alongside API

Update `server/src/index.ts` to import the worker:
```ts
import './workers/dispatch'; // Starts the BullMQ worker process
```

**✅ Phase 3 done when:** An event ingested via API is actually HTTP-delivered to a test endpoint (use [webhook.site](https://webhook.site) to test).

---

## Phase 4 — Backend: Retry, DLQ & Replay

**Goal:** Add DLQ management and manual replay API.

### Step 4.1 — Replay Endpoint

Add to `server/src/api/events/route.ts`:
```ts
// POST /v1/events/:id/replay
eventRouter.post('/:id/replay', async (req: Request, res: Response) => {
  const event = await db.event.findUnique({ where: { id: req.params.id } });

  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.status !== 'DEAD_LETTERED') {
    return res.status(409).json({ error: 'Only DEAD_LETTERED events can be replayed' });
  }

  await db.event.update({
    where: { id: event.id },
    data: { status: 'DISPATCHING', retryCount: 0, failureReason: null },
  });

  await enqueueEvent(event.id);

  return res.json({ event_id: event.id, status: 'replaying' });
});

// POST /v1/events/replay/bulk
eventRouter.post('/replay/bulk', async (req: Request, res: Response) => {
  const { event_ids } = req.body as { event_ids: string[] };
  if (!Array.isArray(event_ids) || event_ids.length === 0) {
    return res.status(400).json({ error: 'event_ids array required' });
  }

  const results = await Promise.allSettled(
    event_ids.map(async (id) => {
      const event = await db.event.findUnique({ where: { id } });
      if (!event || event.status !== 'DEAD_LETTERED') throw new Error(`${id}: not replayable`);
      await db.event.update({ where: { id }, data: { status: 'DISPATCHING', retryCount: 0 } });
      await enqueueEvent(id);
      return id;
    })
  );

  return res.json({
    replayed: results.filter(r => r.status === 'fulfilled').map((r: any) => r.value),
    failed: results.filter(r => r.status === 'rejected').map((r: any) => r.reason.message),
  });
});
```

**✅ Phase 4 done when:** A dead-lettered event can be replayed via API and successfully delivers.

---

## Phase 5 — Backend: Security Layer

**Goal:** Add SSRF protection and finalize API key security.

### Step 5.1 — SSRF Protection Utility

Create `server/src/core/ssrf-guard.ts`:
```ts
import dns from 'dns/promises';
import net from 'net';

const BLOCKED_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

export async function isSafeUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false; // Force HTTPS only

    const addresses = await dns.resolve4(parsed.hostname);
    for (const ip of addresses) {
      if (BLOCKED_RANGES.some(r => r.test(ip))) return false;
    }
    return true;
  } catch {
    return false;
  }
}
```

### Step 5.2 — Validate Endpoint URL on Creation

Use `isSafeUrl()` in the endpoint creation route before saving to DB.

### Step 5.3 — Endpoint Management Routes

Create `server/src/api/endpoints/route.ts`:
```ts
import { Router } from 'express';
import { db } from '../../config/db';
import { authMiddleware } from '../../middleware/auth';
import crypto from 'crypto';
import { isSafeUrl } from '../../core/ssrf-guard';

export const endpointRouter = Router();
endpointRouter.use(authMiddleware);

endpointRouter.post('/', async (req, res) => {
  const { url, max_retries, timeout_ms } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!(await isSafeUrl(url))) {
    return res.status(400).json({ error: 'URL is invalid or targets a private network' });
  }

  const signingSecret = crypto.randomBytes(32).toString('hex');
  const endpoint = await db.endpoint.create({
    data: { url, signingSecret, maxRetries: max_retries || 5, timeoutMs: timeout_ms || 30000 },
  });

  return res.status(201).json({ ...endpoint, signing_secret: signingSecret }); // shown once
});

endpointRouter.get('/', async (req, res) => {
  const endpoints = await db.endpoint.findMany({ where: { isActive: true } });
  return res.json(endpoints.map(e => ({ ...e, signingSecret: undefined }))); // never expose
});

endpointRouter.patch('/:id', async (req, res) => {
  const { max_retries, timeout_ms, url } = req.body;
  if (url && !(await isSafeUrl(url))) {
    return res.status(400).json({ error: 'URL targets a private network' });
  }
  const updated = await db.endpoint.update({
    where: { id: req.params.id },
    data: { ...(url && { url }), ...(max_retries && { maxRetries: max_retries }), ...(timeout_ms && { timeoutMs: timeout_ms }) },
  });
  return res.json(updated);
});

endpointRouter.delete('/:id', async (req, res) => {
  await db.endpoint.update({ where: { id: req.params.id }, data: { isActive: false } });
  return res.status(204).send();
});
```

Mount in `index.ts`:
```ts
import { endpointRouter } from './api/endpoints/route';
app.use('/v1/endpoints', endpointRouter);
```

**✅ Phase 5 done when:** Registering an endpoint with `http://192.168.1.1` is rejected with 400.

---

## Phase 6 — Backend: Observability

**Goal:** Structured logging and health checks.

### Step 6.1 — Structured Logger

```bash
npm install pino pino-pretty
```

Create `server/src/config/logger.ts`:
```ts
import pino from 'pino';

export const logger = pino({
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});
```

Replace all `console.log` / `console.error` calls with `logger.info()` / `logger.error()`.

### Step 6.2 — Request Logging Middleware

```ts
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({ method: req.method, url: req.url, status: res.statusCode, ms: Date.now() - start });
  });
  next();
});
```

### Step 6.3 — Analytics Summary Endpoint

```ts
app.get('/v1/analytics/summary', authMiddleware, async (req, res) => {
  const [total, delivered, dlq, retrying] = await Promise.all([
    db.event.count(),
    db.event.count({ where: { status: 'DELIVERED' } }),
    db.event.count({ where: { status: 'DEAD_LETTERED' } }),
    db.event.count({ where: { status: 'RETRY_SCHEDULED' } }),
  ]);
  res.json({ total, delivered, dead_lettered: dlq, retrying, success_rate: ((delivered / total) * 100).toFixed(2) + '%' });
});
```

**✅ Phase 6 done when:** Every HTTP request logs a structured JSON line. `/health` returns `{ status: "ok" }`.

---

## Phase 7 — Frontend: Dashboard (Next.js)

**Goal:** Build the monitoring UI. Start only after the backend API is stable.

### Step 7.1 — Initialize Next.js

```bash
cd client
npx create-next-app@latest . --typescript --app --tailwind --eslint
```

### Step 7.2 — Build Pages in This Order

Build each page one at a time, in this sequence:

| Order | Page | Route | API Calls |
|---|---|---|---|
| 1 | **Event List** | `/events` | `GET /v1/events` |
| 2 | **Event Detail** | `/events/[id]` | `GET /v1/events/:id` |
| 3 | **DLQ Manager** | `/dlq` | `GET /v1/events?status=DEAD_LETTERED`, `POST /v1/events/:id/replay` |
| 4 | **Endpoints** | `/endpoints` | `GET /v1/endpoints`, `POST`, `PATCH`, `DELETE` |
| 5 | **Analytics** | `/` (home) | `GET /v1/analytics/summary` |
| 6 | **API Keys** | `/settings` | `GET /v1/api-keys`, `POST`, `DELETE` |

### Step 7.3 — API Client Helper

Create `client/lib/api.ts`:
```ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY!;

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

**✅ Phase 7 done when:** You can browse events, view attempt history, and replay DLQ events from the dashboard UI.

---

## Phase 8 — Infra: Docker & Deployment

**Goal:** Containerize everything for production.

### Step 8.1 — Dockerfile for Server

Create `server/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Step 8.2 — Full Docker Compose (Production-like)

Update `docker-compose.yml` to include the Zyvan server:
```yaml
services:
  server:
    build: ./server
    ports:
      - "3000:3000"
    env_file: ./server/.env
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    ...

  redis:
    image: redis:7-alpine
    ...
```

**✅ Phase 8 done when:** `docker-compose up --build` starts the entire stack with no manual steps.

---

## Phase 9 — Testing & Load Validation

**Goal:** Verify correctness and performance before shipping.

### Step 9.1 — Unit Tests

```bash
npm install -D vitest @vitest/coverage-v8
```

Test these in isolation:
- `calculateBackoff()` — correct delays for each retry number
- `generateSignature()` — matches expected HMAC output
- `isSafeUrl()` — blocks private IPs, allows valid URLs
- Validation schemas with valid and invalid inputs

### Step 9.2 — Integration Tests

Use `supertest` to test the full API flow:
- `POST /v1/events` with valid body → 202
- Same request with same `Idempotency-Key` → 200 (idempotent)
- Missing `Idempotency-Key` → 400
- Invalid API key → 401
- Unknown `endpoint_id` → 404
- Replay a `DEAD_LETTERED` event → 200
- Replay a `DELIVERED` event → 409

### Step 9.3 — Load Testing

Use [autocannon](https://github.com/mcollina/autocannon) or [k6](https://k6.io):
```bash
npx autocannon -c 100 -d 30 -m POST \
  -H "x-api-key: your_key" \
  -H "Idempotency-Key: test_{{id}}" \
  -H "Content-Type: application/json" \
  -b '{"endpoint_id":"...","event_type":"test","payload":{}}' \
  http://localhost:3000/v1/events
```

**Target:** ≥ 1,000 req/sec on a single instance. Scale workers horizontally if delivery is the bottleneck.

**✅ Phase 9 done when:** All integration tests pass, no event loss under load, and p99 ingest latency is under 50ms.

---

## Final Checklist (Before Shipping)

```
[ ] docker-compose up --build starts the full stack
[ ] POST /v1/events → 202, event in DB, worker delivers it
[ ] Same Idempotency-Key → 200, no duplicate in DB
[ ] 5xx target → retries with backoff → eventually DEAD_LETTERED
[ ] 4xx target → immediately DEAD_LETTERED
[ ] DLQ event replays via API successfully
[ ] Private IP endpoint URL → rejected with 400
[ ] All integration tests pass
[ ] Dashboard shows events, attempts, DLQ, analytics
[ ] /health returns 200
[ ] Structured logs appear on every request
```

---

*[Back to README](../README.md) | [PRD](PRD.md) | [Pre-Build Guide](pre-build-guide.md) | [Architecture](architecture.md)*
