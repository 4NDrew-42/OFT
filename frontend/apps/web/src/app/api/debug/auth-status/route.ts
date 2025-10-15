/**
 * Auth Status Debug Endpoint
 * 
 * Comprehensive authentication debugging to diagnose 401 errors
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { headers, cookies } from 'next/headers';

export async function GET() {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    
    // Get headers
    const headersList = headers();
    const cookieStore = cookies();
    
    // Get all cookies
    const allCookies = cookieStore.getAll();
    
    // Find NextAuth cookies
    const sessionToken = cookieStore.get('next-auth.session-token') || 
                        cookieStore.get('__Secure-next-auth.session-token') ||
                        cookieStore.get('__Host-next-auth.session-token');
    
    const csrfToken = cookieStore.get('next-auth.csrf-token') ||
                     cookieStore.get('__Host-next-auth.csrf-token');
    
    const callbackUrl = cookieStore.get('next-auth.callback-url') ||
                       cookieStore.get('__Secure-next-auth.callback-url');
    
    // Environment check
    const envCheck = {
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      nodeEnv: process.env.NODE_ENV,
      nextAuthUrl: process.env.NEXTAUTH_URL,
    };
    
    return Response.json({
      timestamp: new Date().toISOString(),
      session: {
        exists: !!session,
        hasUser: !!session?.user,
        hasEmail: !!session?.user?.email,
        email: session?.user?.email || null,
        name: session?.user?.name || null,
      },
      cookies: {
        total: allCookies.length,
        hasSessionToken: !!sessionToken,
        hasCsrfToken: !!csrfToken,
        hasCallbackUrl: !!callbackUrl,
        sessionTokenName: sessionToken?.name || null,
        sessionTokenLength: sessionToken?.value?.length || 0,
        allCookieNames: allCookies.map(c => c.name),
      },
      environment: envCheck,
      headers: {
        host: headersList.get('host'),
        userAgent: headersList.get('user-agent'),
        referer: headersList.get('referer'),
        cookie: headersList.get('cookie') ? 'present' : 'missing',
      },
      diagnosis: getDiagnosis(session, sessionToken, envCheck),
    });
    
  } catch (error) {
    return Response.json({
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

function getDiagnosis(session: any, sessionToken: any, envCheck: any): string[] {
  const issues: string[] = [];
  
  if (!session) {
    issues.push('❌ No session found - user is NOT logged in');
  } else {
    issues.push('✅ Session exists - user IS logged in');
  }
  
  if (!sessionToken) {
    issues.push('❌ No session token cookie found');
  } else {
    issues.push(`✅ Session token cookie found: ${sessionToken.name}`);
  }
  
  if (!envCheck.hasNextAuthSecret) {
    issues.push('❌ NEXTAUTH_SECRET is missing');
  }
  
  if (!envCheck.hasNextAuthUrl) {
    issues.push('❌ NEXTAUTH_URL is missing');
  }
  
  if (!envCheck.hasGoogleClientId || !envCheck.hasGoogleClientSecret) {
    issues.push('⚠️  Google OAuth credentials missing');
  }
  
  if (!session && sessionToken) {
    issues.push('🔴 CRITICAL: Session token exists but session is null - possible NEXTAUTH_SECRET mismatch');
  }
  
  return issues;
}

