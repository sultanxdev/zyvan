# Zyvan Threat Model & Security Mitigations

This document outlines the threat modeling, attack surfaces, risk assessments, and implemented defense-in-depth mitigations for the Zyvan webhook delivery platform.

---

## 1. Threat Matrix & Mitigations Summary

| Threat / Attack Vector | Severity | Impact | Implemented Mitigation |
| :--- | :---: | :--- | :--- |
| **Cross-Tenant Data Access (IDOR)** | Critical | Tenant data compromise or unauthorized resource mutation | Strict `organizationId` predicate enforced at the database repository layer on all CRUD operations. Session context verifies tenant membership. |
| **Server-Side Request Forgery (SSRF)** | High | Internal network scanning, AWS/GCP metadata service exfiltration | Pre-dispatch asynchronous DNS resolution, blocklist of loopback, RFC1918 private IPv4, link-local, and IPv6 ranges. HTTPS enforcement in production. |
| **Webhook Replay Attacks** | High | Re-processing of completed transactions by external receivers | Timestamped HMAC-SHA256 signatures (`t=...,v1=...`) with configurable clock-skew replay tolerance (default 300s). |
| **API Key Compromise / Leakage** | High | Unauthorized ingestion and event injection | Zero plaintext key storage. SHA-256 hashing with server-side pepper. Instant soft-deletion revocation. Distinct `zyvan_live_` and `zyvan_test_` prefixes. |
| **Ingestion Denial of Service (DoS)** | Medium | Service degradation or broker queue memory exhaustion | Token-bucket rate limiting per project/destination, RabbitMQ backpressure, payload size limits (1MB default). |
| **Poison Pill Payload Delivery Loop** | Medium | Delivery worker thread starvation | Exponential backoff with jitter, bounded maximum attempts, and automatic dead-letter queue (DLQ) routing with manual replay approval. |

---

## 2. Deep Dive: SSRF Defense Architecture

Webhook delivery systems inherently dispatch HTTP requests to arbitrary user-supplied URLs. Without strict defenses, malicious actors can submit internal infrastructure URLs:
- `http://169.254.169.254/latest/meta-data/` (AWS IAM credentials)
- `http://127.0.0.1:5432` or `http://localhost:6379` (Internal database ports)
- `http://metadata.google.internal` (GCP service account tokens)

### Defense Implementation:
1. **Asynchronous DNS Pre-Resolution**:
   Before establishing an HTTP connection, the destination hostname is resolved to IPv4 and IPv6 addresses using `dns.promises.lookup()`.
2. **IP Range Blocklist Validation**:
   - `127.0.0.0/8` (Loopback)
   - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (RFC 1918 Private)
   - `169.254.0.0/16` (Link-local / Cloud Metadata)
   - `::1` (IPv6 Loopback), `fe80::/10` (IPv6 Link-local), `fc00::/7` (IPv6 Unique Local)
3. **Redirect Disabling / Re-validation**:
   HTTP redirects (`301`, `302`, `307`) are intercepted and re-validated against the SSRF checker before following.

---

## 3. Webhook Cryptographic Verification Standard

Zyvan generates signatures adhering to the Standard Webhooks v1 specification:
```http
POST /webhook HTTP/1.1
Host: api.customer.com
Zyvan-Signature: t=1710928100,v1=9b3a4f820c71a399f...
Zyvan-Idempotency: evt_01J98FA88101
Content-Type: application/json
```

### Signature Verification Algorithm:
1. Extract timestamp $t$ and signature $v1$ from the `Zyvan-Signature` header.
2. Verify that $|\text{current\_time} - t| \le \text{tolerance}$ (mitigates replay attacks).
3. Compute expected signature:
   $$\text{expected} = \text{HMAC-SHA256}\left(\text{signingSecret}, t + "." + \text{rawBody}\right)$$
4. Perform constant-time equality comparison:
   $$\text{crypto.timingSafeEqual}(\text{signature}, \text{expected})$$
   *(Prevents timing side-channel attacks)*.

---

## 4. Tenant Boundary Isolation Enforcement

In a shared multi-tenant database:
```sql
-- CORRECT (Zyvan Pattern):
SELECT * FROM "Destination"
WHERE "id" = $1 AND "organizationId" = $2;

-- REJECTED (Vulnerable Pattern):
SELECT * FROM "Destination"
WHERE "id" = $1;
```

Even if an attacker guesses or steals a valid UUID `dest_abc123` belonging to another organization, queries executed with their session credentials return `404 Not Found` or `403 Forbidden` because `organizationId` does not match.
