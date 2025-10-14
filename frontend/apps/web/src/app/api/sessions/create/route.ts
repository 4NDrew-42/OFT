/**
 * Session Create API Proxy
 * 
 * Authenticated proxy for creating new chat sessions.
 * Enforces single-user authorization and mints JWT tokens.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { buildOrionJWT } from '@/lib/auth-token';
import { resolveStableUserId } from '@/lib/session/identity';

const BACKEND_URL = process.env.CHAT_SERVICE_URL || 'https://orion-chat.sidekickportal.com';

export async function POST(req: Request) {
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

    // 3. Parse request body
    const body = await req.json().catch(() => ({}));
    
    // 4. CRITICAL: Force userId to authenticated user (ignore any provided value)
    const sanitizedBody = {
      userId,
      firstMessage: body.firstMessage || undefined
    };

    // 5. Mint JWT with authenticated userId
    const token = buildOrionJWT(userId);

    // 6. Forward to backend with forced userId
    const response = await fetch(`${BACKEND_URL}/api/sessions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Origin': 'https://www.sidekickportal.com',
        'X-Request-Id': crypto.randomUUID(),
      },
      body: JSON.stringify(sanitizedBody),
    });

    // 7. Return backend response
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Session create error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create session',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

