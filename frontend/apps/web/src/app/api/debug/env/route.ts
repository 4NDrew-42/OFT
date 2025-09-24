import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || null,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || null,
    VERCEL_ENV: process.env.VERCEL_ENV || null,
  });
}

