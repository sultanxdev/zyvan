import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.BACKEND_API_URL || 'http://localhost:4000';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, await params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, await params);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, await params);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, await params);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, await params);
}

async function handleProxy(request: NextRequest, params: { path: string[] }) {
  const path = (params.path || []).join('/');
  const searchParams = request.nextUrl.search;
  const targetUrl = `${API_BASE_URL}/${path}${searchParams}`;

  try {
    const headers: Record<string, string> = {};
    request.headers.forEach((val, key) => {
      if (!['host', 'content-length'].includes(key.toLowerCase())) {
        headers[key] = val;
      }
    });

    let body: any = undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        body = await request.text();
      } catch {
        // No body
      }
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(5000),
    });

    const responseData = await response.text();
    return new NextResponse(responseData, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Backend proxy error',
        message: error?.message || 'Unable to connect to Zyvan API backend on port 4000',
      },
      { status: 503 }
    );
  }
}
