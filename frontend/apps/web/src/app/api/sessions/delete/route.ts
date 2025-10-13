/**
 * Session Delete API Proxy
 * 
 * Authenticated proxy for deleting chat sessions.
 * Enforces single-user authorization and mints JWT tokens.
 */

import { getServerSession } from 'next-auth/next';
import { buildOrionJWT } from '@/lib/auth-token';
import { resolveStableUserId } from '@/lib/session/identity';

const BACKEND_URL = process.env.CHAT_SERVICE_URL || 'https://orion-chat.sidekickportal.com';

export async function POST(req: Request) {
  try {
    // 1. Verify session
    const session = await getServerSession();
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
    
    if (!body.sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. CRITICAL: Don't include userId in request (backend will verify session ownership)
    const sanitizedBody = {
      sessionId: body.sessionId
    };

    // 5. Mint JWT with authenticated userId
    const token = buildOrionJWT(userId);

    // 6. Forward to backend
    const response = await fetch(`${BACKEND_URL}/api/sessions/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Request-Id': crypto.randomUUID(),
      },
      body: JSON.stringify(sanitizedBody),
    });

    // 7. Return backend response
    if (response.ok) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Session delete error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete session',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

