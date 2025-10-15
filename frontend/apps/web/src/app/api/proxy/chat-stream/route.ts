import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { buildOrionJWT } from "@/lib/auth-token";
import { resolveStableUserId } from '@/lib/session/identity';

export const runtime = "nodejs";

// Session cache to persist sessionId across requests
const sessionCache = new Map<string, { sessionId: string; createdAt: number }>();
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get or create a persistent session for the user
 */
async function getOrCreateSession(userId: string, token: string): Promise<string> {
  // Check cache
  const cached = sessionCache.get(userId);
  if (cached && (Date.now() - cached.createdAt) < SESSION_TTL) {
    return cached.sessionId;
  }
  
  // Create new session via backend API
  try {
    const response = await fetch('https://orion-chat.sidekickportal.com/api/sessions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        firstMessage: ''
      })
    });
    
    if (response.ok) {
      const session = await response.json();
      const sessionData = {
        sessionId: session.sessionId,
        createdAt: Date.now()
      };
      sessionCache.set(userId, sessionData);
      console.log(`✅ Created new session for ${userId}: ${session.sessionId}`);
      return session.sessionId;
    } else {
      console.warn(`⚠️ Session creation failed (${response.status}), using fallback`);
    }
  } catch (error) {
    console.error('Session creation error:', error);
  }
  
  // Fallback: generate sessionId (backend will auto-create if needed)
  const fallbackSessionId = `web_${userId}_${Date.now()}`;
  const sessionData = {
    sessionId: fallbackSessionId,
    createdAt: Date.now()
  };
  sessionCache.set(userId, sessionData);
  return fallbackSessionId;
}

export async function GET(req: Request) {
  // 1. CRITICAL: Verify session first
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. CRITICAL: Enforce single-user (throws if not authorized)
  const userId = resolveStableUserId(session.user.email);

  // 3. Parse query parameters
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const historyParam = url.searchParams.get("history");

  // CRITICAL: Don't accept 'sub' from query params - use authenticated userId
  if (!q) {
    return new Response("missing query parameter: q", { status: 400 });
  }

  // 4. Mint JWT with authenticated userId
  let token: string;
  try {
    token = buildOrionJWT(userId);
  } catch (e) {
    return new Response("server_not_configured", { status: 500 });
  }

  const reqId = req.headers.get("x-request-id") || (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

  // 5. Get or create persistent session
  const sessionId = await getOrCreateSession(userId, token);

  // Pure proxy to backend - let backend make ALL decisions
  const SSE_STREAM_URL = 'https://orion-chat.sidekickportal.com/api/chat-stream';

  // Pass only essential parameters with authenticated userId and persistent sessionId
  const params = new URLSearchParams({
    message: q,
    userId: userId, // Use authenticated userId, not query param
    sessionId: sessionId, // Use persistent sessionId
  });

  // Pass conversation history if provided (backend decides how to use it)
  if (historyParam) {
    params.append('conversationHistory', historyParam);
  }

  const upstream = await fetch(`${SSE_STREAM_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Request-Id": reqId,
      "Accept": "text/event-stream",
    },
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text || "stream_error", { status: upstream.status });
  }

  // Transform the SSE stream to fix backend's escaped newlines
  const reader = upstream.body?.getReader();
  if (!reader) {
    return new Response("no_stream_body", { status: 500 });
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode chunk and replace literal \n\n with actual newlines
          let chunk = decoder.decode(value, { stream: true });
          chunk = chunk.replace(/\\n\\n/g, '\n\n');

          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (error) {
        console.error('Stream error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

