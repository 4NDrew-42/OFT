/**
 * Test endpoint to verify routing is working
 * GET /api/test-404
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'OK',
    message: 'API routes are working!',
    timestamp: new Date().toISOString(),
    deployment: process.env.VERCEL_URL || 'local',
  });
}

export async function POST() {
  return NextResponse.json({
    status: 'OK',
    message: 'POST is working!',
    timestamp: new Date().toISOString(),
  });
}

