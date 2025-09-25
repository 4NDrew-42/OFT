import crypto from "crypto";
import { CHAT_STREAM_URL } from "@/lib/env";

export const runtime = "nodejs";

function base64url(input: Buffer | string) {
  const b = (typeof input === "string" ? Buffer.from(input) : input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return b;
}

function signHS256(payload: Record<string, any>, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  const encodedSig = base64url(sig);
  return `${data}.${encodedSig}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const sub = url.searchParams.get("sub");
  if (!q || !sub) {
    return new Response("missing q or sub", { status: 400 });
    }

  const iss = process.env.ORION_SHARED_JWT_ISS || "https://www.sidekickportal.com";
  const aud = process.env.ORION_SHARED_JWT_AUD || "orion-core";
  const secret = process.env.ORION_SHARED_JWT_SECRET;
  if (!secret) return new Response("server_not_configured", { status: 500 });

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 5;
  const token = signHS256({ iss, aud, sub, iat: now, exp }, secret);

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

