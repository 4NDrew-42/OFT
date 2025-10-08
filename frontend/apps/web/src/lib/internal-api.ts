import { NextRequest } from 'next/server';

const DEFAULT_BASE_URL = 'http://localhost:3000';

export function resolveInternalUrl(pathname: string, req?: NextRequest): string | null {
  const hostHeader = req?.headers.get('host');
  const forwardedProto = req?.headers.get('x-forwarded-proto') || 'https';

  const candidateBases = [
    req?.nextUrl?.origin,
    hostHeader ? `${forwardedProto}://${hostHeader}` : undefined,
    process.env.NEXTAUTH_URL,
    process.env.INTERNAL_BASE_URL,
    process.env.API_BASE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    DEFAULT_BASE_URL,
  ].filter((value): value is string => Boolean(value));

  for (const base of candidateBases) {
    try {
      return new URL(pathname, base).toString();
    } catch (error) {
      // Ignore invalid base URL and continue to next candidate
    }
  }

  return null;
}

export function buildInternalHeaders(req?: NextRequest, init?: HeadersInit): Headers {
  const headers = new Headers(init);

  if (!headers.has('X-Request-Id')) {
    const requestId = req?.headers.get('x-request-id') || crypto.randomUUID();
    headers.set('X-Request-Id', requestId);
  }

  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && !headers.has('Authorization')) {
      headers.set('Authorization', authHeader);
    }

    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader && !headers.has('Cookie')) {
      headers.set('Cookie', cookieHeader);
    }
  }

  return headers;
}
