'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  CopyIcon,
  Tick01Icon,
  FlashIcon,
  ShieldCheckIcon,
  ServerIcon,
  Database01Icon,
  RotateRight01Icon,
  PlayIcon,
  Alert01Icon,
  CheckmarkCircle02Icon,
  Key01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';

export default function DocsPage() {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [quickstartTab, setQuickstartTab] = useState<'curl' | 'node' | 'python' | 'go'>('curl');
  const [verifyTab, setVerifyTab] = useState<'node' | 'python' | 'go'>('node');

  const copyCode = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(key);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const quickstartSnippets = {
    curl: `curl -X POST https://api.zyvan.dev/v1/events \\
  -H "Authorization: Bearer zyvan_live_e891c01b2a98f128c94e09f872" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "invoice.payment_succeeded",
    "tenant_id": "cust_tenant_9921",
    "idempotency_key": "inv_pay_882910_99182",
    "data": {
      "invoice_id": "inv_882910",
      "amount": 14900,
      "currency": "USD",
      "customer_email": "finance@acmecorp.com"
    }
  }'`,
    node: `import { Zyvan } from '@zyvan/sdk';

const zyvan = new Zyvan({
  apiKey: process.env.ZYVAN_API_KEY!,
});

// Durable ingestion returns in < 15ms
const event = await zyvan.events.create({
  type: 'invoice.payment_succeeded',
  tenantId: 'cust_tenant_9921',
  idempotencyKey: 'inv_pay_882910_99182',
  data: {
    invoiceId: 'inv_882910',
    amount: 14900,
    currency: 'USD',
  },
});

console.log('Committed event ID:', event.id);`,
    python: `import os
from zyvan import Zyvan

zyvan = Zyvan(api_key=os.environ.get("ZYVAN_API_KEY"))

# Durable event publish
event = zyvan.events.create(
    type="invoice.payment_succeeded",
    tenant_id="cust_tenant_9921",
    idempotency_key="inv_pay_882910_99182",
    data={
        "invoice_id": "inv_882910",
        "amount": 14900,
        "currency": "USD",
    }
)

print(f"Event published to RabbitMQ pipeline: {event.id}")`,
    go: `package main

import (
    "context"
    "fmt"
    "os"
    "github.com/zyvan/zyvan-go"
)

func main() {
    client := zyvan.NewClient(os.Getenv("ZYVAN_API_KEY"))

    event, err := client.Events.Create(context.Background(), &zyvan.CreateEventParams{
        Type:           "invoice.payment_succeeded",
        TenantID:       "cust_tenant_9921",
        IdempotencyKey: "inv_pay_882910_99182",
        Data: map[string]any{
            "invoice_id": "inv_882910",
            "amount":     14900,
        },
    })
    if err != nil {
        panic(err)
    }

    fmt.Printf("Queued in RabbitMQ: %s\\n", event.ID)
}`,
  };

  const verificationSnippets = {
    node: `import crypto from 'crypto';
import express from 'express';

const app = express();
// IMPORTANT: Zyvan HMAC verification requires the raw unparsed request body!
app.use(express.raw({ type: 'application/json' }));

function verifyZyvanWebhook(payload: Buffer, signatureHeader: string, secret: string): boolean {
  // Header format: t=1725278400,v1=5d41402abc4b2a76b9719d911017c592...
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => p.split('='))
  );

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  // Replay Attack Tolerance: reject events older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
    return false;
  }

  // Compute HMAC-SHA256 of: timestamp + "." + raw_payload
  const signedPayload = \`\${timestamp}.\${payload.toString('utf8')}\`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

app.post('/webhook', (req, res) => {
  const sig = req.headers['zyvan-signature'] as string;
  const isValid = verifyZyvanWebhook(req.body, sig, process.env.ZYVAN_SIGNING_SECRET!);

  if (!isValid) {
    return res.status(401).send('Invalid Zyvan HMAC signature');
  }

  const event = JSON.parse(req.body.toString('utf8'));
  console.log('Verified event:', event.type);
  res.status(200).json({ received: true });
});`,
    python: `import hmac
import hashlib
import time
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

def verify_zyvan_webhook(raw_body: bytes, signature_header: str, secret: str) -> bool:
    # Header format: t=1725278400,v1=5d41402abc...
    elements = dict(item.split("=") for item in signature_header.split(","))
    timestamp = elements.get("t")
    signature = elements.get("v1")

    if not timestamp or not signature:
        return False

    # Prevent replay attacks (> 5 minutes old)
    if abs(time.time() - int(timestamp)) > 300:
        return False

    signed_payload = f"{timestamp}.{raw_body.decode('utf-8')}".encode('utf-8')
    expected = hmac.new(secret.encode('utf-8'), signed_payload, hashlib.sha256).hexdigest()

    return hmac.compare_digest(signature, expected)

@app.post("/webhook")
async def handle_webhook(request: Request):
    raw_body = await request.body()
    sig_header = request.headers.get("zyvan-signature", "")
    secret = "whsec_e891c01b2a98f128c94e09f872"

    if not verify_zyvan_webhook(raw_body, sig_header, secret):
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")

    return {"status": "ok"}`,
    go: `package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "io"
    "net/http"
    "strconv"
    "strings"
    "time"
)

func verifyZyvanWebhook(body []byte, sigHeader, secret string) bool {
    var timestamp, signature string
    for _, part := range strings.Split(sigHeader, ",") {
        kv := strings.SplitN(part, "=", 2)
        if len(kv) == 2 {
            if kv[0] == "t" {
                timestamp = kv[1]
            } else if kv[0] == "v1" {
                signature = kv[1]
            }
        }
    }
    if timestamp == "" || signature == "" {
        return false
    }

    t, err := strconv.ParseInt(timestamp, 10, 64)
    if err != nil || time.Now().Unix()-t > 300 {
        return false // Replay protection
    }

    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(fmt.Sprintf("%s.%s", timestamp, string(body))))
    expected := hex.EncodeToString(mac.Sum(nil))

    return hmac.Equal([]byte(signature), []byte(expected))
}`,
  };

  return (
    <div className="space-y-12 text-sm leading-relaxed">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="space-y-3 pb-6 border-b border-border/80">
        <Badge variant="pill" className="text-xs px-2.5 py-0.5 font-mono">
          Developer Documentation
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Zyvan Infrastructure Documentation
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
          Everything you need to durably ingest events in &lt;15ms, route webhooks through RabbitMQ, authenticate using machine tokens, and verify HMAC-SHA256 signatures.
        </p>
      </div>

      {/* ─── 1. Overview & Architecture ────────────────────────── */}
      <section id="overview" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2">
          <span>01. Overview &amp; Architecture</span>
        </h2>
        <p className="text-zinc-600">
          Zyvan decouples ingestion from delivery. When your backend receives an event, Zyvan immediately stores it in PostgreSQL and queues it in RabbitMQ before returning HTTP 202 Accepted.
        </p>

        {/* Architecture flow card */}
        <div className="p-5 rounded-2xl border border-border bg-white shadow-xs space-y-4 font-mono text-xs">
          <strong className="text-zinc-950 font-bold block">The 4 Invariants of Zyvan:</strong>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
              <span className="text-[#00DC5A] font-bold">1. At-Least-Once Delivery</span>
              <p className="text-zinc-600">Events are never acknowledged to producers until durably fsynced to PostgreSQL.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
              <span className="text-zinc-950 font-bold">2. Idempotency Boundary</span>
              <p className="text-zinc-600">Enforced via <code className="text-zinc-900 font-bold">UNIQUE(project_id, idempotency_key)</code>. Re-sent events return the existing ID.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
              <span className="text-zinc-950 font-bold">3. Zero-Overwrite DLQ</span>
              <p className="text-zinc-600">Exhausted retries preserve all historical attempt timestamps and latency. Replays create new delivery lineages.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
              <span className="text-zinc-950 font-bold">4. SSRF Protected</span>
              <p className="text-zinc-600">Target webhook URLs are resolved against DNS rebind filters; private 10.x, 192.168.x, and 127.x IP ranges are blocked.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. Quickstart ─────────────────────────────────────── */}
      <section id="quickstart" className="space-y-4 scroll-mt-24">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
            02. 5-Minute Quickstart
          </h2>
          <div className="flex items-center rounded-lg border border-border bg-white p-0.5 text-xs font-mono">
            {(['curl', 'node', 'python', 'go'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setQuickstartTab(tab)}
                className={`px-3 py-1 rounded-md transition-all uppercase cursor-pointer ${
                  quickstartTab === tab ? 'bg-zinc-950 text-white font-bold' : 'text-zinc-600 hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="relative rounded-2xl bg-zinc-950 border border-zinc-800 p-5 font-mono text-xs text-zinc-100 overflow-x-auto shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 text-zinc-400">
            <span className="text-[11px]">POST /v1/events — Event Ingestion</span>
            <button
              onClick={() => copyCode('qs', quickstartSnippets[quickstartTab])}
              className="flex items-center gap-1 hover:text-white cursor-pointer"
            >
              <Icon icon={copiedSnippet === 'qs' ? Tick01Icon : CopyIcon} size={14} className={copiedSnippet === 'qs' ? 'text-[#00DC5A]' : ''} />
              <span>{copiedSnippet === 'qs' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="leading-relaxed whitespace-pre font-mono">
            {quickstartSnippets[quickstartTab]}
          </pre>
        </div>

        <div className="p-4 rounded-xl border border-border bg-white text-xs space-y-1 font-mono">
          <div className="flex items-center gap-2 text-emerald-800 font-bold">
            <Icon icon={CheckmarkCircle02Icon} size={16} className="text-[#00DC5A]" />
            <span>Response: HTTP 202 Accepted</span>
          </div>
          <p className="text-zinc-600 font-sans">
            Zyvan confirms durable receipt in ~14ms. Delivery workers will execute delivery to all registered tenant destinations asynchronously.
          </p>
        </div>
      </section>

      {/* ─── 3. Webhook Signature Verification ─────────────────── */}
      <section id="signature-verification" className="space-y-4 scroll-mt-24">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
              03. HMAC-SHA256 Webhook Verification
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Verify the <code className="font-mono text-zinc-950">zyvan-signature</code> header to ensure webhooks genuinely originate from Zyvan.
            </p>
          </div>

          <div className="flex items-center rounded-lg border border-border bg-white p-0.5 text-xs font-mono">
            {(['node', 'python', 'go'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setVerifyTab(tab)}
                className={`px-3 py-1 rounded-md transition-all uppercase cursor-pointer ${
                  verifyTab === tab ? 'bg-zinc-950 text-white font-bold' : 'text-zinc-600 hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="relative rounded-2xl bg-zinc-950 border border-zinc-800 p-5 font-mono text-xs text-zinc-100 overflow-x-auto shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 text-zinc-400">
            <span className="text-[11px]">HMAC-SHA256 Verification Implementation</span>
            <button
              onClick={() => copyCode('ver', verificationSnippets[verifyTab])}
              className="flex items-center gap-1 hover:text-white cursor-pointer"
            >
              <Icon icon={copiedSnippet === 'ver' ? Tick01Icon : CopyIcon} size={14} className={copiedSnippet === 'ver' ? 'text-[#00DC5A]' : ''} />
              <span>{copiedSnippet === 'ver' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="leading-relaxed whitespace-pre font-mono">
            {verificationSnippets[verifyTab]}
          </pre>
        </div>
      </section>

      {/* ─── 4. REST API Reference ─────────────────────────────── */}
      <section id="api-post-events" className="space-y-6 scroll-mt-24">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
          04. Complete REST API Reference
        </h2>

        {/* POST /v1/events */}
        <Card className="bg-white border-border shadow-xs overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/70 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-zinc-950 text-white font-mono font-bold text-xs">POST</span>
              <span className="font-mono font-bold text-sm text-foreground">/v1/events</span>
            </div>
            <Badge variant="pill" className="text-[10px] font-mono">events:write</Badge>
          </CardHeader>
          <CardContent className="p-5 space-y-4 font-mono text-xs">
            <p className="text-zinc-700 font-sans text-xs">
              Durably stores an incoming event and dispatches delivery jobs into RabbitMQ.
            </p>

            <table className="w-full text-left text-xs border border-border rounded-lg overflow-hidden">
              <thead className="bg-secondary/50 border-b border-border text-zinc-700">
                <tr>
                  <th className="p-2.5">Field</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Required</th>
                  <th className="p-2.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-2.5 font-bold">type</td>
                  <td className="p-2.5 text-zinc-500">string</td>
                  <td className="p-2.5 text-emerald-600 font-bold">Yes</td>
                  <td className="p-2.5 text-zinc-700 font-sans">Event type (e.g. <code>invoice.paid</code>)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold">tenant_id</td>
                  <td className="p-2.5 text-zinc-500">string</td>
                  <td className="p-2.5 text-emerald-600 font-bold">Yes</td>
                  <td className="p-2.5 text-zinc-700 font-sans">Tenant isolation boundary</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold">idempotency_key</td>
                  <td className="p-2.5 text-zinc-500">string</td>
                  <td className="p-2.5 text-emerald-600 font-bold">Yes</td>
                  <td className="p-2.5 text-zinc-700 font-sans">Client unique key preventing duplicate processing</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold">data</td>
                  <td className="p-2.5 text-zinc-500">object</td>
                  <td className="p-2.5 text-emerald-600 font-bold">Yes</td>
                  <td className="p-2.5 text-zinc-700 font-sans">Custom JSON event payload</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* POST /v1/destinations */}
        <Card id="api-destinations" className="bg-white border-border shadow-xs overflow-hidden scroll-mt-24">
          <CardHeader className="p-5 pb-3 border-b border-border/70 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-zinc-950 text-white font-mono font-bold text-xs">POST</span>
              <span className="font-mono font-bold text-sm text-foreground">/v1/destinations</span>
            </div>
            <Badge variant="pill" className="text-[10px] font-mono">destinations:manage</Badge>
          </CardHeader>
          <CardContent className="p-5 space-y-4 font-mono text-xs">
            <p className="text-zinc-700 font-sans text-xs">
              Registers an HTTPS webhook endpoint. Generates a secure AES-256 HMAC signing secret for the endpoint.
            </p>
          </CardContent>
        </Card>

        {/* POST /v1/events/:id/replay */}
        <Card id="api-replay" className="bg-white border-border shadow-xs overflow-hidden scroll-mt-24">
          <CardHeader className="p-5 pb-3 border-b border-border/70 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-zinc-950 text-white font-mono font-bold text-xs">POST</span>
              <span className="font-mono font-bold text-sm text-foreground">/v1/events/:id/replay</span>
            </div>
            <Badge variant="pill" className="text-[10px] font-mono">events:write</Badge>
          </CardHeader>
          <CardContent className="p-5 space-y-4 font-mono text-xs">
            <p className="text-zinc-700 font-sans text-xs">
              Schedules a non-destructive replay for a dead-lettered event. Creates a fresh delivery lineage without modifying original attempt histories.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ─── 5. Queue Mechanics & Exponential Backoff ──────────── */}
      <section id="backoff-jitter" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
          05. Queue Mechanics &amp; Exponential Backoff
        </h2>
        <p className="text-zinc-600">
          Zyvan uses delayed RabbitMQ TTL queues with Dead-Letter Exchange (DLX) routing to avoid worker sleep blocking.
        </p>

        <div className="p-5 rounded-2xl border border-border bg-white shadow-xs space-y-3 font-mono text-xs">
          <strong className="text-zinc-950 block font-bold font-sans">Exponential Backoff with Full Jitter Formula:</strong>
          <div className="p-3.5 rounded-xl bg-zinc-950 text-zinc-100 text-sm">
            <code>T = min(BaseDelay * 2^attempt + Jitter, MaxDelay)</code>
          </div>
          <p className="text-muted-foreground text-xs font-sans">
            Random jitter prevents thundering-herd spikes on receiving customer servers when large upstream outages recover.
          </p>
        </div>
      </section>

      {/* ─── Next Steps Callout ─────────────────────────────────── */}
      <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold">Ready to test Zyvan in action?</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Explore the live simulator or view your active infrastructure metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800">
            <Link href="/dashboard/simulator">Launch Simulator</Link>
          </Button>
          <Button size="sm" asChild className="bg-white text-zinc-950 hover:bg-zinc-100 font-semibold">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
