import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { buildOrionJWT } from "@/lib/auth-token";
import { resolveStableUserId } from '@/lib/session/identity';

export const runtime = "nodejs";

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

  // Pure proxy to backend - let backend make ALL decisions
  const SSE_STREAM_URL = 'https://orion-chat.sidekickportal.com/api/chat-stream';

  // Pass only essential parameters with authenticated userId
  const params = new URLSearchParams({
    message: q,
    userId: userId, // Use authenticated userId, not query param
    sessionId: `web_${userId}_${Date.now()}`,
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
