import { buildOrionJWT } from "@/lib/auth-token";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const sub = url.searchParams.get("sub");
  const historyParam = url.searchParams.get("history");

  if (!q || !sub) {
    return new Response("missing q or sub", { status: 400 });
  }

  let token: string;
  try {
    token = buildOrionJWT(sub);
  } catch (e) {
    return new Response("server_not_configured", { status: 500 });
  }

  const reqId = req.headers.get("x-request-id") || (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

  // Pure proxy to backend - let backend make ALL decisions
  const SSE_STREAM_URL = 'https://orion-chat.sidekickportal.com/api/chat-stream';

  // Pass only essential parameters, backend decides everything else
  const params = new URLSearchParams({
    message: q,
    userId: sub,
    sessionId: `web_${sub}_${Date.now()}`,
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
