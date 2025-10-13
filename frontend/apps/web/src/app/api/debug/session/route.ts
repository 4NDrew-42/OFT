/**
 * Debug Session Endpoint
 * 
 * Returns current session information for debugging.
 * REMOVE IN PRODUCTION!
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    return new Response(JSON.stringify({
      hasSession: !!session,
      hasUser: !!session?.user,
      hasEmail: !!session?.user?.email,
      email: session?.user?.email || null,
      name: session?.user?.name || null,
      sessionData: session ? {
        user: session.user,
        expires: session.expires
      } : null
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to get session',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

