/**
 * Clear Cookies API Route
 * 
 * Helps users clear invalid session cookies by setting them to expire immediately.
 * This is useful when NEXTAUTH_SECRET changes and old session tokens become invalid.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.json({ 
    message: 'Cookies cleared. Please refresh the page to log in again.',
    cleared: [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      '__Host-next-auth.csrf-token',
      '__Secure-next-auth.callback-url'
    ]
  });

  // Clear all NextAuth cookies by setting them to expire in the past
  const cookieOptions = {
    path: '/',
    expires: new Date(0),
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
  };

  response.cookies.set('next-auth.session-token', '', cookieOptions);
  response.cookies.set('__Secure-next-auth.session-token', '', cookieOptions);
  response.cookies.set('__Host-next-auth.csrf-token', '', cookieOptions);
  response.cookies.set('__Secure-next-auth.callback-url', '', cookieOptions);

  return response;
}

