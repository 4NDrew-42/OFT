/**
 * Debug endpoint to test all API routes
 * GET /api/debug/test-routes
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;
  
  const routes = [
    '/api/sessions/list',
    '/api/sessions/create',
    '/api/sessions/messages',
    '/api/sessions/save-message',
    '/api/proxy/chat-stream',
    '/api/auth/session',
  ];

  const results = await Promise.all(
    routes.map(async (route) => {
      try {
        const response = await fetch(`${baseUrl}${route}`, {
          method: 'GET',
          headers: {
            'Cookie': request.headers.get('cookie') || '',
          },
        });

        return {
          route,
          status: response.status,
          statusText: response.statusText,
          exists: response.status !== 404,
          authenticated: response.status !== 401,
        };
      } catch (error) {
        return {
          route,
          status: 'ERROR',
          statusText: error instanceof Error ? error.message : 'Unknown error',
          exists: false,
          authenticated: false,
        };
      }
    })
  );

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    baseUrl,
    results,
    summary: {
      total: routes.length,
      existing: results.filter(r => r.exists).length,
      authenticated: results.filter(r => r.authenticated).length,
      missing: results.filter(r => !r.exists).length,
    },
  });
}

