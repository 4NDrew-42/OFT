export function base64url(input: Buffer | string) {
  const b = (typeof input === "string" ? Buffer.from(input) : input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return b;
}

import crypto from "crypto";

export function signHS256(payload: Record<string, any>, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  const encodedSig = base64url(sig);
  return `${data}.${encodedSig}`;
}

export function buildOrionJWT(sub: string, expiresSeconds = 300): string {
  const iss = process.env.ORION_SHARED_JWT_ISS || "https://www.sidekickportal.com";
  const aud = process.env.ORION_SHARED_JWT_AUD || "orion-core";
  const secret = process.env.ORION_SHARED_JWT_SECRET;
  if (!secret) throw new Error("server_not_configured");
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresSeconds;
  return signHS256({ iss, aud, sub, iat: now, exp }, secret);
}

