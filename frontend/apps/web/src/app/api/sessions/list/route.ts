/**
 * Session List API Proxy
 * 
 * Authenticated proxy for listing user's chat sessions.
 * Enforces single-user authorization and mints JWT tokens.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { signHS256 } from '@/lib/auth-token';
import { resolveStableUserId } from '@/lib/session/identity';

const BACKEND_URL = process.env.CHAT_SERVICE_URL || 'https://orion-chat.sidekickportal.com';

export async function GET(req: Request) {
  try {
    // 1. Verify session
    const session = await getServerSession(authOptions);

    // DEBUG: Log session details
    console.log('[sessions/list] Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasEmail: !!session?.user?.email,
      email: session?.user?.email,
      timestamp: new Date().toISOString()
    });

    if (!session?.user?.email) {
      console.error('[sessions/list] 401 - No session or email');
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        debug: {
          hasSession: !!session,
          hasUser: !!session?.user,
          hasEmail: !!session?.user?.email
        }
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Enforce single-user (throws if not authorized)
    let userId: string;
    try {
      userId = resolveStableUserId(session.user.email);
    } catch (e: any) {
      const authorized = (process.env.NEXT_PUBLIC_AUTHORIZED_USER_EMAIL || 'jamesandrewklein@gmail.com').toLowerCase();
      console.warn('[sessions/list] 403 - Unauthorized user', {
        sessionEmail: session.user.email,
        authorized,
      });
      return new Response(JSON.stringify({ error: 'Forbidden', reason: 'unauthorized_user', debug: { sessionEmail: session.user.email, authorized } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. Parse query parameters
    const url = new URL(req.url);
    const params = new URLSearchParams();
    
    // CRITICAL: Force userId to authenticated user (ignore any provided value)
    params.set('userId', userId);
    
    // Pass through optional parameters
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = url.searchParams.get('limit');
    const sortBy = url.searchParams.get('sortBy');
    const sortOrder = url.searchParams.get('sortOrder');
    
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (limit) params.set('limit', limit);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);

    // 4. Mint JWT with authenticated userId (use chat-service secret override, trim trailing newlines)
    const iss = process.env.ORION_SHARED_JWT_ISS || 'https://www.sidekickportal.com';
    const aud = process.env.ORION_CHAT_JWT_AUD || process.env.ORION_SHARED_JWT_AUD || 'orion-core';
    let secret = process.env.ORION_CHAT_SERVICE_JWT_SECRET || process.env.ORION_SHARED_JWT_SECRET;
    if (!secret) {
      console.error('[sessions/list] Missing JWT secret');
      return new Response(JSON.stringify({ error: 'server_not_configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    secret = secret.replace(/\n+$/, '');
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 300;
    const token = signHS256({ iss, aud, sub: userId, iat: now, exp }, secret);

    // 5. Forward to backend
    const response = await fetch(`${BACKEND_URL}/api/sessions/list?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Request-Id': crypto.randomUUID(),
      },
    });

    // 6. Return backend response (with debug on error)
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.warn('[sessions/list] Upstream error', { status: response.status, text: text.slice(0, 400) });
      return new Response(JSON.stringify({ error: 'upstream_error', status: response.status, body: text }), { status: response.status, headers: { 'Content-Type': 'application/json' } });
    }
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Session list error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to list sessions',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

