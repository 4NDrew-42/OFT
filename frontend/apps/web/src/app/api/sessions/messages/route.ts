/**
 * Session Messages API Proxy
 * 
 * Authenticated proxy for retrieving session messages.
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
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Enforce single-user (throws if not authorized)
    const userId = resolveStableUserId(session.user.email);

    // 3. Parse query parameters
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId parameter' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Mint JWT with authenticated userId (use chat-service secret override, trim trailing newlines)
    const iss = process.env.ORION_SHARED_JWT_ISS || 'https://www.sidekickportal.com';
    const aud = process.env.ORION_CHAT_JWT_AUD || process.env.ORION_SHARED_JWT_AUD || 'orion-core';
    let secret = process.env.ORION_CHAT_SERVICE_JWT_SECRET || process.env.ORION_SHARED_JWT_SECRET;
    if (!secret) {
      console.error('[sessions/messages] Missing JWT secret');
      return new Response(JSON.stringify({ error: 'server_not_configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    secret = secret.replace(/\n+$/, '');
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 300;
    const token = signHS256({ iss, aud, sub: userId, iat: now, exp }, secret);

    // 5. Forward to backend
    const response = await fetch(`${BACKEND_URL}/api/sessions/messages?sessionId=${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Request-Id': crypto.randomUUID(),
      },
    });

    // 6. Return backend response
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Session messages error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get messages',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

