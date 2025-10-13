/**
 * Session List API Proxy
 * 
 * Authenticated proxy for listing user's chat sessions.
 * Enforces single-user authorization and mints JWT tokens.
 */

import { getServerSession } from 'next-auth/next';
import { buildOrionJWT } from '@/lib/auth-token';
import { resolveStableUserId } from '@/lib/session/identity';

const BACKEND_URL = process.env.CHAT_SERVICE_URL || 'http://192.168.50.79:3002';

export async function GET(req: Request) {
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

    // 4. Mint JWT with authenticated userId
    const token = buildOrionJWT(userId);

    // 5. Forward to backend
    const response = await fetch(`${BACKEND_URL}/api/sessions/list?${params.toString()}`, {
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

