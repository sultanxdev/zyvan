# Zyvan Documentation

Welcome to the comprehensive documentation for **Zyvan** — a production-ready, reliable webhook and event delivery infrastructure platform.

---

## What is Zyvan in Simple Words?

Imagine you run an e-commerce platform. When a customer pays for an order, your system needs to notify three external services:
1. **The warehouse** to ship the item.
2. **The accounting software** to generate an invoice.
3. **The CRM** to send an email to the customer.

In real life:
- External servers can go down or crash.
- Network requests can timeout or get dropped.
- Servers can return `500 Internal Server Error`.
- Requests can get sent twice by mistake.

If you write a simple `fetch()` loop in your application code, a single slow destination will block your users, a crashed destination will lose the event forever, and a network retry could charge the customer twice.

**Zyvan solves this completely.**
Your application sends the event to Zyvan once. Zyvan immediately saves it safely to PostgreSQL, checks for duplicates, and hands it to a background worker queue. The worker signs the webhook with a cryptographic signature, sends it out, retries transient failures automatically using exponential backoff with jitter, moves permanently failed deliveries to a Dead Letter Queue (DLQ), and lets you replay failures with a single click — all while keeping a complete, tamper-proof history of every attempt.

---

## Documentation Sections

Explore each section below for detailed technical explanations and diagrams:

1. [System Architecture](architecture.md)
   - High-level architecture and system components
   - Ingestion plane vs. delivery plane
   - RabbitMQ delayed retry with TTL + Dead-Letter Exchange (DLX)
   - Failure recovery and graceful shutdown

2. [Entity-Relationship (ER) & Database Design](er-diagram.md)
   - PostgreSQL as the single source of truth
   - Complete Prisma models and Mermaid ER diagram
   - The critical distinction: **Event ≠ Delivery**
   - Indexes and database-level uniqueness constraints for idempotency

3. [Class & Sequence Diagrams](class-and-sequence.md)
   - Architecture module hierarchy and interfaces
   - Ingestion & Idempotency sequence diagram
   - Delivery, HMAC signing & Attempt tracking sequence diagram
   - Exponential backoff & delayed retry sequence diagram
   - DLQ transition and safe Replay sequence diagram

4. [Technology Stack & Rationale](tech-stack.md)
   - Technology choices: Node.js, Express, TypeScript, PostgreSQL, Prisma, RabbitMQ, Vitest
   - Why RabbitMQ with TTL + DLX instead of basic cron loops
   - Security primitives: AES-256-GCM encryption, HMAC-SHA256, SSRF protection

5. [API Reference](api.md)
   - Complete endpoint catalogue
   - Authentication (Bearer API key) and RBAC scopes
   - Request and response contracts with status codes
   - Zyvan standard error contract
