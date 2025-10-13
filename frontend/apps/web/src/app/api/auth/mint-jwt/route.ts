/**
 * JWT Minting API - SECURED
 *
 * Mints ORION-CORE JWT tokens for authenticated users only.
 * CRITICAL: Enforces single-user authorization.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { buildOrionJWT } from '@/lib/auth-token';
import { resolveStableUserId } from '@/lib/session/identity';

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // 1. CRITICAL: Verify session first
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. CRITICAL: Enforce single-user (throws if not authorized)
    const userId = resolveStableUserId(session.user.email);

    // 3. CRITICAL: Ignore any 'sub' from request body
    // const body = await req.json(); // DON'T USE THIS

    // 4. Mint JWT with authenticated userId only
    const token = buildOrionJWT(userId);

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
    });
  } catch (err: any) {
    console.error('JWT minting error:', err);
    return new Response(JSON.stringify({
      error: 'internal_error',
      message: err instanceof Error ? err.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

