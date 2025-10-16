import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { buildOrionJWT } from "@/lib/auth-token";
import { resolveStableUserId } from '@/lib/session/identity';

export const runtime = "nodejs";

export async function GET(req: Request) {
  // 1) Auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 });
  const userId = resolveStableUserId(session.user.email);

  // 2) Parse query
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const historyParam = url.searchParams.get("history");
  if (!q) return new Response("missing query parameter: q", { status: 400 });

  // 3) Token + sessionId
  let token: string;
  try { token = buildOrionJWT(userId); } catch { return new Response("server_not_configured", { status: 500 }); }
  const reqId = req.headers.get("x-request-id") || (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

  // 4) Prepare POST payload
  let conversationHistory: any[] = [];
  if (historyParam) {
    try { conversationHistory = (JSON.parse(historyParam) as any[]).slice(-10); } catch {}
  }

  const upstream = await fetch('https://orion-chat.sidekickportal.com/api/chat-stream-v2', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Request-Id": reqId,
      "Accept": "text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: q,
      userId,
      sessionId: `web_${userId}`,
      conversationHistory,
    })
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return new Response(text || "stream_error", { status: upstream.status || 500 });
  }

  // 5) SSE transformer: backend emits JSON events; frontend expects plain text lines
  // Convert: {type:"status"} -> drop; {type:"content", text:"..."} -> emit as bare data lines
  const reader = upstream.body.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // split on double newline boundaries separating SSE events
          let idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const eventChunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);

            // Find data: lines and merge
            const dataLines = eventChunk.split('\n').filter(l => l.startsWith('data: ')).map(l => l.slice(6)).join('');
            if (!dataLines) continue;

            // Try parse JSON event from backend
            try {
              const evt = JSON.parse(dataLines);
              if (evt.type === 'content' && typeof evt.text === 'string') {
                // Emit plain SSE with only text (no JSON wrapper), respecting SSE multi-line rules
                const lines = String(evt.text).split('\\n');
                for (const line of lines) {
                  controller.enqueue(encoder.encode(`data: ${line}\\n`));
                }
                controller.enqueue(encoder.encode(`\\n`));
              } else if (evt.type === 'done') {
                // Optionally signal done
                const out = `data: [DONE]\n\n`;
                controller.enqueue(encoder.encode(out));
              } else {
                // Drop status and other types
              }
            } catch {
              // Not JSON, forward as-is (split into SSE data lines)
              const lines2 = String(dataLines).split('\n');
              for (const line2 of lines2) {
                controller.enqueue(encoder.encode(`data: ${line2}\n`));
              }
              controller.enqueue(encoder.encode(`\n`));
            }
          }
        }
      } catch (err) {
        console.error('Proxy SSE error:', err);
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    }
  });
}

