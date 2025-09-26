import { NextResponse } from "next/server";
import { FABRIC_BASE_URL, STATUS_URL, CHAT_STREAM_URL, OCR_URL } from "@/lib/env";

export const runtime = "nodejs";

async function fetchWithTimeout(url: string, ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    const text = await res.text();
    return { ok: true, status: res.status, body: text.slice(0, 256) };
  } catch (e: any) {
    return { ok: false, error: e?.name || "error", message: e?.message?.slice(0, 256) || "" };
  } finally {
    clearTimeout(id);
  }
}

export async function GET() {
  const publicConfig = {
    FABRIC_BASE_URL,
    STATUS_URL,
    CHAT_STREAM_URL,
    OCR_URL,
    VERCEL_ENV: process.env.VERCEL_ENV || null,
    NEXT_PUBLIC_ORION_API_URL: process.env.NEXT_PUBLIC_ORION_API_URL || null,
    NEXT_PUBLIC_STATUS_URL: process.env.NEXT_PUBLIC_STATUS_URL || null,
    NEXT_PUBLIC_CHAT_STREAM_URL: process.env.NEXT_PUBLIC_CHAT_STREAM_URL || null,
    NEXT_PUBLIC_OCR_URL: process.env.NEXT_PUBLIC_OCR_URL || null,
  };

  const secretsPresent = {
    ORION_SHARED_JWT_SECRET: Boolean(process.env.ORION_SHARED_JWT_SECRET),
    ORION_SHARED_JWT_ISS: Boolean(process.env.ORION_SHARED_JWT_ISS),
    ORION_SHARED_JWT_AUD: Boolean(process.env.ORION_SHARED_JWT_AUD),
  };

  const health = await fetchWithTimeout(`${FABRIC_BASE_URL}/health`, 5000);

  return NextResponse.json({ publicConfig, secretsPresent, upstreamHealth: health });
}

