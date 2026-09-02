'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { CopyIcon, Tick01Icon, CodeIcon } from '@hugeicons/core-free-icons';

type Language = 'curl' | 'node' | 'python';

const snippets: Record<Language, { label: string; code: string }> = {
  curl: {
    label: 'cURL',
    code: `# 1. Ingest an event (Idempotent, commits to PostgreSQL in < 15ms)
curl -X POST https://api.zyvan.dev/v1/events \\
  -H "Authorization: Bearer zyvan_live_e891c..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "invoice.payment_succeeded",
    "tenant_id": "cust_store_9921",
    "idempotency_key": "inv_checkout_8819",
    "data": {
      "invoice_id": "inv_8819",
      "amount": 25000,
      "currency": "USD"
    }
  }'

# Response: HTTP 202 Accepted
# { "event_id": "7fa1bc82-019e...", "status": "queued", "duplicate": false }`,
  },
  node: {
    label: 'Node.js (TypeScript)',
    code: `import crypto from 'node:crypto';

// Verifying Zyvan HMAC-SHA256 Signature in your Express/Next.js handler
export function verifyWebhook(
  rawBody: string,
  signatureHeader: string,
  timestampHeader: string,
  signingSecret: string
): boolean {
  // Prevent replay attacks (reject timestamps older than 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestampHeader)) > 300) {
    return false;
  }

  const signedPayload = \`\${timestampHeader}.\${rawBody}\`;
  const expectedSignature = \`v1=\${crypto
    .createHmac('sha256', signingSecret)
    .update(signedPayload)
    .digest('hex')}\`;

  // Use timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expectedSignature)
  );
}`,
  },
  python: {
    label: 'Python (FastAPI / Flask)',
    code: `import hmac
import hashlib
import time

def verify_zyvan_webhook(
    raw_body: bytes,
    signature_header: str,
    timestamp_header: str,
    signing_secret: str
) -> bool:
    # Reject webhooks older than 5 minutes
    current_time = int(time.time())
    if abs(current_time - int(timestamp_header)) > 300:
        return False

    signed_content = f"{timestamp_header}.".encode("utf-8") + raw_body
    computed_signature = "v1=" + hmac.new(
        signing_secret.encode("utf-8"),
        signed_content,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature_header, computed_signature)`,
  },
};

export function CodeQuickstart() {
  const [activeLang, setActiveLang] = useState<Language>('curl');
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(snippets[activeLang].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="quickstart" className="py-20 sm:py-24 bg-secondary/30 relative">
      <div className="mx-auto max-w-[1040px] px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="pill" className="mb-3">
            Developer Quickstart
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Integrate in minutes with any language
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Simple HTTP semantics for ingestion and standard HMAC-SHA256 signature verification on receipt.
          </p>
        </div>

        <div className="w-full mx-auto">
          {/* Card Container */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden font-mono text-xs text-white">
            {/* Header Tabs */}
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-4 py-3">
              <div className="flex items-center gap-2">
                {(['curl', 'node', 'python'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                      activeLang === lang
                        ? 'bg-zinc-800 text-white font-semibold border border-zinc-700 shadow-xs'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {snippets[lang].label}
                  </button>
                ))}
              </div>

              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Icon icon={Tick01Icon} size={14} className="text-[#00DC5A]" />
                    <span className="text-[#00DC5A]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Icon icon={CopyIcon} size={14} />
                    <span>Copy Snippet</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Body */}
            <div className="p-6 overflow-x-auto text-zinc-300 leading-relaxed">
              <pre className="whitespace-pre-wrap">{snippets[activeLang].code}</pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
