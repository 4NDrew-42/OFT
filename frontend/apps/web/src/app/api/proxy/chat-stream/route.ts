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

  const upstreamUrl = new URL(CHAT_STREAM_URL);
  upstreamUrl.searchParams.set("q", q);

  const reqId = req.headers.get("x-request-id") || (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
  const upstream = await fetch(upstreamUrl.toString(), {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
      "X-Request-Id": reqId,
    },
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return new Response(text || "upstream_error", { status: upstream.status });
  }

  // Pipe upstream SSE to client
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}

