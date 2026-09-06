# Zyvan — API Reference

This document provides the complete API specification for the Zyvan REST API.

---

## 1. General API Conventions

- **Base URL**: `http://localhost:4000` (or `https://api.zyvan.dev` in production)
- **Content Type**: `application/json` for all request bodies and responses
- **Authentication**: All protected endpoints require a Bearer token:
  ```http
  Authorization: Bearer zyvan_live_xxxxxxxxxxxxxxxxxxxxxxxx
  ```
- **Request Identification**: Every request receives a unique `request_id` passed via the `X-Request-Id` response header and included in all error responses.

---

## 2. Standard Error Contract

Zyvan returns consistent error envelopes across all endpoints:

```json
{
  "code": "invalid_request",
  "message": "Validation failed",
  "request_id": "req_01955f1a-b33c-74a9-b7b5-2d1f7c8a4102",
  "details": {
    "errors": [
      {
        "path": "url",
        "message": "Invalid url"
      }
    ]
  }
}
```

### Standard Error Codes:
- `invalid_request` (400): Malformed JSON, validation failure, or SSRF-blocked URL.
- `authentication_failed` (401): Missing, invalid, or expired API key.
- `authorization_denied` (403): API key lacks the required scope for the operation.
- `not_found` (404): The requested project, tenant, event, or destination does not exist.
- `conflict` (409): Duplicate resource, bootstrap already completed, or tenant paused.
- `rate_limited` (429): Ingestion or destination rate limit exceeded.
- `internal_error` (500): Unexpected internal server error.

---

## 3. Endpoints Overview

### 3.1 System & Health (Unauthenticated)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Process liveness check (returns 200 OK) |
| `GET` | `/ready` | Readiness check: verifies live PostgreSQL and RabbitMQ connectivity |
| `GET` | `/v1` | Service metadata (name, version, description) |
| `POST` | `/v1/bootstrap` | Initializes first project and admin API key (works only when 0 projects exist) |

---

### 3.2 Projects (`projects:read`, `projects:manage`)

#### `POST /v1/projects`
Create a new project isolation boundary.
- **Request Body**:
  ```json
  {
    "name": "Production Store",
    "plan": "free"
  }
  ```
- **Response**: `201 Created`

#### `GET /v1/projects`
List all projects accessible to the key.

#### `GET /v1/projects/:id`
Get project details.

#### `PATCH /v1/projects/:id`
Update project name or status (`active` | `disabled`).

---

### 3.3 Tenants (`tenants:manage`)

Tenants provide noisy-neighbor capacity protection within a project.

#### `POST /v1/tenants`
- **Request Body**:
  ```json
  {
    "externalId": "shop_store_9921",
    "name": "Downtown Boutique",
    "concurrencyLimit": 5,
    "rateLimit": 100
  }
  ```
- **Response**: `201 Created`

#### `GET /v1/tenants`
List all tenants in the project.

#### `GET /v1/tenants/:id`
Get tenant details.

#### `PATCH /v1/tenants/:id`
Update tenant limits or status (`active`, `paused`, `disabled`).

---

### 3.4 Destinations (`destinations:manage`)

Where Zyvan delivers webhooks. Signing secrets are never returned in plain text.

#### `POST /v1/destinations`
- **Request Body**:
  ```json
  {
    "tenantId": "c4b3c95e-18d6-4bc6-8d59-24ec985f403e",
    "url": "https://api.example.com/webhooks/orders",
    "secret": "whsec_super_secret_signing_key_32bytes",
    "retryPolicy": {
      "maxAttempts": 5,
      "baseDelay": 1,
      "maxDelay": 3600
    },
    "rateLimit": 20
  }
  ```
- **Response**: `201 Created` (secret masked as `secretConfigured: true`).

#### `GET /v1/destinations`
List all destinations in the project.

#### `POST /v1/destinations/:id/pause`
Temporarily pause webhook delivery to this destination without dropping queued items.

#### `POST /v1/destinations/:id/resume`
Resume webhook delivery.

#### `POST /v1/destinations/:id/test`
Sends a lightweight test ping to the destination URL to verify reachability.

---

### 3.5 Events (`events:write`, `events:read`)

The core ingestion and observation engine.

#### `POST /v1/events`
Durable ingestion endpoint. Returns `202 Accepted` immediately after committing to PostgreSQL and queueing to RabbitMQ.

- **Request Body**:
  ```json
  {
    "type": "order.completed",
    "tenant_id": "shop_store_9921",
    "idempotency_key": "order_checkout_inv_88219",
    "data": {
      "order_id": "ord_88219",
      "amount": 25000,
      "currency": "USD"
    },
    "headers": {
      "X-Source": "Mobile-App"
    }
  }
  ```

- **Response (New Event)**: `202 Accepted`
  ```json
  {
    "event_id": "7fa1bc82-019e-4a6c-b3a1-7c9e018d991b",
    "status": "queued",
    "created_at": "2026-09-02T15:00:00.000Z",
    "duplicate": false
  }
  ```

- **Response (Duplicate Idempotency Key)**: `200 OK`
  ```json
  {
    "event_id": "7fa1bc82-019e-4a6c-b3a1-7c9e018d991b",
    "status": "queued",
    "created_at": "2026-09-02T15:00:00.000Z",
    "duplicate": true
  }
  ```

#### `GET /v1/events`
List events with cursor pagination and filters (`eventType`, `tenantId`, `status`, `from`, `to`, `search`, `limit`, `cursor`).

#### `GET /v1/events/:id`
Fetches complete event details including **all deliveries and historical attempt timelines**.

---

### 3.6 Deliveries (`events:read`)

#### `GET /v1/destinations/:destinationId/deliveries`
List deliveries targeted at a specific destination, including attempt counts, latest status, and latency.

---

### 3.7 Dead Letter Queue (DLQ) (`events:read`)

#### `GET /v1/dead-letters`
List all deliveries that have permanently failed (exhausted retries or encountered terminal 4xx errors) along with the failure reason and event context.

#### `GET /v1/dead-letters/:id`
Inspect a specific DLQ record with full attempt-by-attempt diagnostic history (HTTP response bodies, error messages, and latency).

---

### 3.8 Replay (`events:write`)

#### `POST /v1/events/:id/replay`
Creates a **brand new delivery lineage** for a failed or past event without overwriting historical attempt data.

- **Request Body (Optional)**:
  ```json
  {
    "destinationId": "c4b3c95e-18d6-4bc6-8d59-24ec985f403e"
  }
  ```
- **Response**: `202 Accepted`
  ```json
  {
    "replay_id": "8aa14b2e-7819-4db2-a9b0-98cc21a4f001",
    "delivery_id": "b11c998f-019e-4b6a-9a11-8c44e99a1288",
    "event_id": "7fa1bc82-019e-4a6c-b3a1-7c9e018d991b",
    "status": "queued"
  }
  ```

---

### 3.9 Usage Metering (`usage:read`)

#### `GET /v1/usage`
Query aggregated operational metrics over an optional date range (`?from=2026-09-01T00:00:00Z&to=2026-09-02T23:59:59Z`).

- **Response**: `200 OK`
  ```json
  {
    "data": {
      "events": {
        "total": 12431,
        "byStatus": {
          "queued": 45,
          "delivering": 12,
          "retrying": 8,
          "delivered": 12350,
          "dead_letter": 16,
          "expired": 0,
          "cancelled": 0
        }
      },
      "deliveries": {
        "total": 15200,
        "byStatus": {
          "queued": 45,
          "delivering": 12,
          "retrying": 8,
          "delivered": 15119,
          "failed": 16,
          "cancelled": 0
        }
      },
      "attempts": {
        "total": 15410,
        "byOutcome": {
          "success": 15119,
          "failed": 240,
          "timeout": 45,
          "error": 6
        },
        "averageLatencyMs": 142
      },
      "deadLetters": {
        "total": 16
      },
      "period": {
        "from": "2026-09-01T00:00:00.000Z",
        "to": "2026-09-02T23:59:59.000Z"
      }
    }
  }
  ```
