import crypto from "crypto";
import { STATUS_URL } from "@/lib/env";
import { buildOrionJWT } from "@/lib/auth-token";

export const runtime = "nodejs";



export async function GET(req: Request) {
  const url = new URL(req.url);
  const sub = url.searchParams.get("sub");
  if (!sub) return new Response("missing sub", { status: 400 });

  let token: string;
  try {
    token = buildOrionJWT(sub);
  } catch (e) {
    return new Response("server_not_configured", { status: 500 });
  }

  const reqId = req.headers.get("x-request-id") || (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

  const upstream = await fetch(STATUS_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-Request-Id": reqId,
    },
    cache: "no-store",
  });

  const text = await upstream.text();
  return new Response(text || "", {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") || "application/json", "Cache-Control": "no-store" },
  });
}

