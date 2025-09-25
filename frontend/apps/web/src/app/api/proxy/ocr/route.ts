import crypto from "crypto";
import { OCR_URL } from "@/lib/env";

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

export async function POST(req: Request) {
  const url = new URL(req.url);
  const sub = url.searchParams.get("sub");
  if (!sub) return new Response("missing sub", { status: 400 });

  const iss = process.env.ORION_SHARED_JWT_ISS || "https://www.sidekickportal.com";
  const aud = process.env.ORION_SHARED_JWT_AUD || "orion-core";
  const secret = process.env.ORION_SHARED_JWT_SECRET;
  if (!secret) return new Response("server_not_configured", { status: 500 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return new Response("missing file", { status: 400 });
  if (typeof file === "object" && "size" in file) {
    const max = 5 * 1024 * 1024; // 5MB
    if ((file as File).size > max) {
      return new Response(JSON.stringify({ error: "file_too_large", limit_bytes: max }), {
        status: 413,
        headers: { "Retry-After": "10", "Content-Type": "application/json" },
      });
    }
  }

  // Rebuild a fresh FormData to ensure clean streaming to upstream
  const upstreamForm = new FormData();
  for (const [k, v] of form.entries()) {
    upstreamForm.append(k, v as any);
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 5;
  const token = signHS256({ iss, aud, sub, iat: now, exp }, secret);
  const reqId = req.headers.get("x-request-id") || (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

  const upstream = await fetch(OCR_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Request-Id": reqId,
      // Do NOT set Content-Type here; fetch will set proper multipart boundary
    },
    body: upstreamForm,
  });

  const contentType = upstream.headers.get("content-type") || "application/json";
  const buf = await upstream.arrayBuffer();
  return new Response(buf, {
    status: upstream.status,
    headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
  });
}

