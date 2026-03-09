<p align="center">
  <img src="docs/assets/logo.svg" alt="Zyvan Logo" width="120" />
</p>

# Zyvan: Webhook Reliability Engine

> **Eliminate Webhook Data Loss.** Zyvan is a high-performance, distributed middleware that guarantees at-least-once delivery between your core services and external endpoints. Built with Node.js, PostgreSQL, Redis, and a Next.js Dashboard.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Status: Production Ready](https://img.shields.io/badge/Status-Production--Ready-blue)
![Build: Dockerized](https://img.shields.io/badge/Build-Dockerized-green)

---

## 🧐 The Engineering Problem

Calling external webhooks directly from your core API creates a **tight coupling** and a **single point of failure**:
- ❌ **Downstream Downtime**: If the receiver is down, your data is lost forever.
- ❌ **Latency Spikes**: Waiting for a slow webhook response ties up a thread and blocks your core API.
- ❌ **Zombies**: Failed events without observability are impossible to debug and replay.

**Zyvan acts as a shock absorber.** It separates **Acceptance** (Sync & Fast) from **Delivery** (Async & Reliable).

---

## 🚀 Key Architectural Features
- **🛡️ Idempotent Ingestion**: Never process the same event twice, even if your internal client aggressively retries the request during a network blip.
- **🔄 Intelligent Retries**: Asynchronous BullMQ workers execute exponential backoff algorithms (with jitter) and configurable target-specific retry limits.
- **💀 Dead Letter Queue (DLQ)**: Poison messages and permanently failed events are automatically segregated for manual inspection and one-click bulk replay via the Dashboard.
- **🔐 HMAC Payload Signing**: Every outbound delivery is signed (HMAC-SHA256) so the receiving server can verify the request's authenticity over the open internet.
- **🛡️ SSRF Prevention**: Zyvan resolves DNS and blocks requests targeting internal IP ranges (e.g., `localhost`, AWS Metadata `169.254.x.x`).
- **🔍 Full Visibility**: Audit logs and a modern React (Next.js) dashboard expose the exact status code, latency, and response body of every single delivery attempt.

---

## 📂 Project Structure

A clean, modern Monorepo structure containing separate stacks for the backend API and frontend Dashboard.

```text
zyvan/
├── client/           # Dashboard UI (Next.js, Tailwind CSS, Recharts)
├── server/           # Core Reliability Engine (Node.js, Express, BullMQ, Prisma)
├── docs/             # Diagrams & Documentation
│   └── interview/    # 🎯 Interview Prep Docs (Resume points, ER Diagrams, Q&A)
├── docker-compose.yml 
└── README.md
```

### 🎯 Interview & Tech Reference
Looking to understand the system design in-depth for an interview or technical presentation?
- **[System Architecture & Data Model Flows](docs/interview/architecture_explanation.md)**: View the system ER Diagrams and Sequence Flows.
- **[Interview Q&A](docs/interview/interview_questions.md)**: 20 Advanced technical questions analyzing the scale and logic of this engine.
- **[Technical Buzzwords](docs/interview/technical_buzzwords.md)**: A cheat-sheet of distributed system jargon (Idempotency, Backoff, SSRF) used here.

---

## 🛠 Tech Stack
- **Engine**: Node.js v20 + Express (TypeScript)
- **Infrastructure**: PostgreSQL 15 (Persistence) & Redis 7 (Queueing)
- **Task Scheduling**: BullMQ (Job dispatching & delays)
- **Database ORM**: Prisma ORM
- **Frontend Dashboard**: Next.js 15 (App Router), React, Tailwind CSS

---

## 🏃 Quick Start (Dockerized)

Zyvan requires zero manual setup. Simply clone and spin up the complete distributed stack (PostgreSQL, Redis, the Node.js API, and the Next.js Client) using Docker Compose.

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/zyvan.git
cd zyvan

# 2. Start the entire stack in detached mode
docker compose up -d --build

# 3. Wait 10-15 seconds for PostgreSQL & server to migrate...

# 4. Open the interactive Dashboard!
# 👉 http://localhost:3001
```

*(Note: The raw Express Ingestion API runs mapped to `http://localhost:3000`)*

---

## 📄 License
Distributed under the MIT License. Built for mission-critical webhooks.
