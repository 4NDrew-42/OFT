import crypto from "crypto";
import { CHAT_STREAM_URL } from "@/lib/env";
import { buildOrionJWT } from "@/lib/auth-token";

export const runtime = "nodejs";


export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const sub = url.searchParams.get("sub");
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

  // Use correct Enhanced Chat endpoint
  const ENHANCED_CHAT_URL = 'http://192.168.50.79:3002/enhanced-chat';

  const upstream = await fetch(ENHANCED_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Request-Id": reqId,
    },
    body: JSON.stringify({ message: q }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text || "enhanced_chat_error", { status: upstream.status });
  }

  const jsonResponse = await upstream.json();
  const responseContent = jsonResponse.response || "No response generated";

  // Convert to SSE format for frontend compatibility
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send the response as SSE data
      controller.enqueue(encoder.encode(`data: ${responseContent}\n\n`));
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}

