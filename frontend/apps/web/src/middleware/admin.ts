import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isAdminEmail, logAdminAction } from '@/lib/auth-utils';

/**
 * Admin middleware to protect admin routes
 */
export async function adminMiddleware(req: NextRequest): Promise<NextResponse> {
  try {
    // Get the JWT token from the request
    const token = await getToken({
      req,
      ...(process.env.NEXTAUTH_SECRET ? { secret: process.env.NEXTAUTH_SECRET } : {})
    });

    // Check if user is authenticated
    if (!token || !token.email) {
      console.log('Admin access denied: No authentication token');
      return NextResponse.redirect(new URL('/?error=admin_auth_required', req.url));
    }

    // Check if user has admin privileges
    if (!isAdminEmail(token.email as string)) {
      console.log(`Admin access denied for email: ${token.email}`);
      
      // Log unauthorized admin access attempt
      await logAdminAction(
        token.email as string,
        'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
        req.nextUrl.pathname,
        { 
          url: req.url,
          method: req.method,
          timestamp: new Date().toISOString()
        },
        req
      );

      return NextResponse.redirect(new URL('/?error=admin_access_denied', req.url));
    }

    // Log successful admin access
    if (req.method !== 'GET' || req.nextUrl.pathname === '/admin') {
      await logAdminAction(
        token.email as string,
        'ADMIN_ACCESS',
        req.nextUrl.pathname,
        { 
          method: req.method,
          timestamp: new Date().toISOString()
        },
        req
      );
    }

    // Add admin info to request headers for downstream use
    const response = NextResponse.next();
    response.headers.set('x-admin-email', token.email as string);
    response.headers.set('x-admin-name', token.name as string || '');
    response.headers.set('x-is-admin', 'true');

    return response;

  } catch (error) {
    console.error('Admin middleware error:', error);
    return NextResponse.redirect(new URL('/?error=admin_middleware_error', req.url));
  }
}

/**
 * API route admin protection
 */
export async function requireAdminAPI(req: NextRequest): Promise<{
  email: string;
  name: string;
  isValid: boolean;
}> {
  try {
    const token = await getToken({
      req,
      ...(process.env.NEXTAUTH_SECRET ? { secret: process.env.NEXTAUTH_SECRET } : {})
    });

    if (!token || !token.email) {
      throw new Error('Authentication required');
    }

    if (!isAdminEmail(token.email as string)) {
      // Log unauthorized API access attempt
      await logAdminAction(
        token.email as string,
        'UNAUTHORIZED_ADMIN_API_ACCESS',
        req.nextUrl.pathname,
        { 
          url: req.url,
          method: req.method,
          timestamp: new Date().toISOString()
        },
        req
      );
      
      throw new Error('Admin privileges required');
    }

    return {
      email: token.email as string,
      name: token.name as string || '',
      isValid: true
    };

  } catch (error) {
    return {
      email: '',
      name: '',
      isValid: false
    };
  }
}

/**
 * Admin action wrapper with rate limiting and logging
 */
export async function withAdminAction<T>(
  req: NextRequest,
  action: string,
  handler: (adminEmail: string) => Promise<T>,
  options: {
    rateLimit?: { maxRequests: number; windowMs: number };
    target?: string;
    details?: Record<string, any>;
  } = {}
): Promise<T> {
  const admin = await requireAdminAPI(req);
  
  if (!admin.isValid) {
    throw new Error('Admin authentication failed');
  }

  // Apply rate limiting if specified
  if (options.rateLimit) {
    const { checkAdminRateLimit } = await import('@/lib/auth-utils');
    const allowed = checkAdminRateLimit(
      admin.email,
      action,
      options.rateLimit.maxRequests,
      options.rateLimit.windowMs
    );
    
    if (!allowed) {
      await logAdminAction(
        admin.email,
        'RATE_LIMIT_EXCEEDED',
        action,
        { 
          ...options.details,
          rateLimit: options.rateLimit
        },
        req
      );
      throw new Error('Rate limit exceeded for admin action');
    }
  }

  try {
    // Execute the admin action
    const result = await handler(admin.email);

    // Log successful admin action
    await logAdminAction(
      admin.email,
      action,
      options.target,
      {
        ...options.details,
        success: true,
        timestamp: new Date().toISOString()
      },
      req
    );

    return result;

  } catch (error) {
    // Log failed admin action
    await logAdminAction(
      admin.email,
      `${action}_FAILED`,
      options.target,
      {
        ...options.details,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      req
    );

    throw error;
  }
}
