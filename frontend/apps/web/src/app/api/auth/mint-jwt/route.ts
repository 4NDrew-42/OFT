import crypto from "crypto";

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
  try {
    const body = await req.json().catch(() => ({}));
    const sub: string | undefined = body?.sub;
    if (!sub) {
      return new Response(JSON.stringify({ error: "missing_sub" }), { status: 400 });
    }

    const iss = process.env.ORION_SHARED_JWT_ISS || "https://www.sidekickportal.com";
    const aud = process.env.ORION_SHARED_JWT_AUD || "orion-core";
    const secret = process.env.ORION_SHARED_JWT_SECRET;
    if (!secret) {
      return new Response(JSON.stringify({ error: "server_not_configured" }), { status: 500 });
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 5; // 5 minutes
    const token = signHS256({ iss, aud, sub, iat: now, exp }, secret);

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500 });
  }
}

