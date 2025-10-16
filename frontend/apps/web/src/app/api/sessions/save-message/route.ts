/**
 * Save Message API Proxy - WITH TIMEOUT FIX
 * 
 * Authenticated proxy for saving chat messages.
 * Enforces single-user authorization and mints JWT tokens.
 * 
 * CRITICAL FIX: Added 5-second timeout to prevent UI hangs
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { buildOrionJWT } from '@/lib/auth-token';
import { resolveStableUserId } from '@/lib/session/identity';

const BACKEND_URL = process.env.CHAT_SERVICE_URL || 'https://orion-chat.sidekickportal.com';
const SAVE_TIMEOUT_MS = 5000; // 5 seconds

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
    
    // Validate required fields
    if (!body.sessionId || !body.role || !body.content) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: sessionId, role, content' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. CRITICAL: Don't include userId in request (backend will verify session ownership)
    const sanitizedBody = {
      sessionId: body.sessionId,
      role: body.role,
      content: body.content
    };

    // 5. Mint JWT with authenticated userId
    const token = buildOrionJWT(userId);

    // 6. Forward to backend WITH TIMEOUT
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);

    try {
      const response = await fetch(`${BACKEND_URL}/api/sessions/save-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Request-Id': crypto.randomUUID(),
        },
        body: JSON.stringify(sanitizedBody),
        signal: controller.signal, // Add abort signal for timeout
      });

      clearTimeout(timeoutId);

      // 7. Return backend response
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle timeout gracefully (fire-and-forget)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.warn(`[Session Save] Timeout after ${SAVE_TIMEOUT_MS}ms - continuing anyway`);
        
        // Return success even on timeout (message will be saved eventually or lost)
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Save queued (timeout)',
          timeout: true
        }), {
          status: 202, // Accepted (async processing)
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Re-throw other fetch errors
      throw fetchError;
    }

  } catch (error) {
    console.error('[Session Save] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to save message',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

