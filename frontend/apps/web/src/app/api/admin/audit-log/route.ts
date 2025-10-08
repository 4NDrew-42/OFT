import { NextRequest, NextResponse } from 'next/server';
import { withAdminAction } from '@/middleware/admin';
import { AdminAuditLog } from '@/lib/auth-utils';
import { buildInternalHeaders, resolveInternalUrl } from '@/lib/internal-api';

// In-memory storage for demo - replace with database in production
let auditLogs: AdminAuditLog[] = [];

/**
 * GET /api/admin/audit-log - Get audit logs
 */
export async function GET(req: NextRequest) {
  try {
    return await withAdminAction(
      req,
      'GET_AUDIT_LOGS',
      async (adminEmail) => {
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const action = url.searchParams.get('action');
        const targetEmail = url.searchParams.get('target_email');

        let filteredLogs = [...auditLogs];

        // Apply filters
        if (action) {
          filteredLogs = filteredLogs.filter(log => 
            log.action.toLowerCase().includes(action.toLowerCase())
          );
        }

        if (targetEmail) {
          filteredLogs = filteredLogs.filter(log => 
            log.target?.toLowerCase().includes(targetEmail.toLowerCase()) ||
            log.adminEmail.toLowerCase().includes(targetEmail.toLowerCase())
          );
        }

        // Sort by timestamp, newest first
        filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Apply pagination
        const paginatedLogs = filteredLogs.slice(offset, offset + limit);

        return NextResponse.json({
          success: true,
          data: paginatedLogs,
          total: filteredLogs.length,
          limit,
          offset,
          hasMore: offset + limit < filteredLogs.length
        });
      }
    );
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: error instanceof Error && error.message.includes('Admin') ? 403 : 500 }
    );
  }
}

/**
 * POST /api/admin/audit-log - Store audit log entry
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const auditEntry: AdminAuditLog = {
      ...body,
      timestamp: new Date(body.timestamp || Date.now())
    };

    // Store in memory
    auditLogs.push(auditEntry);

    // Keep only last 1000 entries to prevent memory issues
    if (auditLogs.length > 1000) {
      auditLogs = auditLogs.slice(-1000);
    }

    // Store in ORION-CORE for persistence
    try {
      const storeUrl = resolveInternalUrl('/api/orion/store-memory', req);

      if (!storeUrl) {
        console.error('Failed to resolve ORION-CORE store-memory endpoint');
      } else {
        const orionResponse = await fetch(storeUrl, {
          method: 'POST',
          headers: buildInternalHeaders(req, {
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            id: `audit-log-${auditEntry.id}`,
            content: `AUDIT LOG: ${auditEntry.adminEmail} performed ${auditEntry.action} on ${auditEntry.target || 'system'} at ${auditEntry.timestamp.toISOString()}`,
            metadata: {
              type: 'audit_log',
              ...auditEntry
            }
          })
        });

        if (!orionResponse.ok) {
          const details = await orionResponse.text().catch(() => orionResponse.statusText);
          console.error('Failed to store audit log in ORION-CORE:', details);
        }
      }
    } catch (orionError) {
      console.error('Failed to store audit log in ORION-CORE:', orionError);
    }

    return NextResponse.json({
      success: true,
      data: auditEntry,
      message: 'Audit log stored'
    });

  } catch (error) {
    console.error('Error storing audit log:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to store audit log' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/audit-log - Clear old audit logs (admin only)
 */
export async function DELETE(req: NextRequest) {
  try {
    return await withAdminAction(
      req,
      'CLEAR_AUDIT_LOGS',
      async (adminEmail) => {
        const url = new URL(req.url);
        const olderThan = url.searchParams.get('older_than'); // ISO date string
        
        if (olderThan) {
          const cutoffDate = new Date(olderThan);
          const originalCount = auditLogs.length;
          auditLogs = auditLogs.filter(log => log.timestamp > cutoffDate);
          const removedCount = originalCount - auditLogs.length;

          return NextResponse.json({
            success: true,
            message: `Removed ${removedCount} audit logs older than ${cutoffDate.toISOString()}`,
            removedCount,
            remainingCount: auditLogs.length
          });
        } else {
          // Clear all logs (dangerous operation)
          const clearedCount = auditLogs.length;
          auditLogs = [];

          return NextResponse.json({
            success: true,
            message: `Cleared all ${clearedCount} audit logs`,
            clearedCount
          });
        }
      },
      {
        rateLimit: { maxRequests: 5, windowMs: 300000 }, // 5 requests per 5 minutes
        details: { olderThan: req.nextUrl.searchParams.get('older_than') }
      }
    );
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: error instanceof Error && error.message.includes('Admin') ? 403 : 500 }
    );
  }
}
