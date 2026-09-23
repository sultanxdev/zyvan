import { NextRequest, NextResponse } from 'next/server';

// Configurable target API gateway URL
const API_BASE_URL = (
  process.env.DOCS_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_API_URL ||
  'http://localhost:4000'
).replace(/\/$/, '');

// Max request payload size (64KB)
const MAX_PAYLOAD_BYTES = 64 * 1024;

// Timeout for upstream requests (8 seconds)
const UPSTREAM_TIMEOUT_MS = 8000;

// Route allowlist regexes to prevent SSRF and internal scanning
const ALLOWED_ROUTE_PATTERNS = [
  /^v1\/events(\/.*)?$/,
  /^v1\/destinations(\/.*)?$/,
  /^v1\/dead-letters(\/.*)?$/,
  /^v1\/projects(\/.*)?$/,
  /^v1\/tenants(\/.*)?$/,
];

// Simple in-memory sliding window rate limiter (60 req / min per IP)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 60;

  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxyRequest(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxyRequest(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxyRequest(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxyRequest(request, await params);
}

async function handleProxyRequest(
  request: NextRequest,
  params: { path: string[] }
) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  // 1. Enforce IP Rate Limiting
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Documentation playground rate limit exceeded. Please wait 60 seconds.',
        },
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'Content-Type': 'application/json',
        },
      }
    );
  }

  const rawPath = (params.path || []).join('/');

  // 2. Enforce Route Allowlist (SSRF Protection)
  const isAllowed = ALLOWED_ROUTE_PATTERNS.some((pattern) => pattern.test(rawPath));
  if (!isAllowed) {
    return NextResponse.json(
      {
        error: {
          code: 'PROXIED_ROUTE_FORBIDDEN',
          message: `The endpoint '/${rawPath}' is not permitted in the documentation sandbox.`,
        },
      },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.search;
  const targetUrl = `${API_BASE_URL}/${rawPath}${searchParams}`;

  // 3. Extract & Validate Request Body
  let bodyContent: string | undefined = undefined;
  if (['POST', 'PATCH', 'PUT'].includes(request.method)) {
    try {
      bodyContent = await request.text();
      if (bodyContent && Buffer.byteLength(bodyContent, 'utf8') > MAX_PAYLOAD_BYTES) {
        return NextResponse.json(
          {
            error: {
              code: 'PAYLOAD_TOO_LARGE',
              message: `Playground payload exceeds the 64KB maximum limit.`,
            },
          },
          { status: 413 }
        );
      }
    } catch {
      // Empty body
    }
  }

  // 4. Construct Upstream Headers (without logging credentials)
  const upstreamHeaders: Record<string, string> = {
    'content-type': 'application/json',
    'accept': 'application/json',
  };

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    upstreamHeaders['authorization'] = authHeader;
  }

  const idempotencyHeader = request.headers.get('idempotency-key');
  if (idempotencyHeader) {
    upstreamHeaders['idempotency-key'] = idempotencyHeader;
  }

  const projectHeader = request.headers.get('x-project-id');
  if (projectHeader) {
    upstreamHeaders['x-project-id'] = projectHeader;
  }

  // 5. Dispatch to Real Upstream Backend
  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: bodyContent,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const responseBody = await upstreamResponse.text();
    const clientHeaders = new Headers();
    clientHeaders.set(
      'content-type',
      upstreamResponse.headers.get('content-type') || 'application/json'
    );
    clientHeaders.set('x-zyvan-proxied', 'true');

    return new NextResponse(responseBody, {
      status: upstreamResponse.status,
      headers: clientHeaders,
    });
  } catch (err: unknown) {
    // Return explicit, authentic offline error — NEVER fake success
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown upstream error';

    return NextResponse.json(
      {
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: `Could not connect to Zyvan API backend at ${API_BASE_URL}. Ensure the API server is running on port 4000.`,
          details: errorMessage,
          targetUrl,
        },
      },
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'x-zyvan-proxied': 'true',
        },
      }
    );
  }
}
