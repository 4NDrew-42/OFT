import { NextRequest, NextResponse } from 'next/server';
import { withAdminAction } from '@/middleware/admin';
import { buildInternalHeaders, resolveInternalUrl } from '@/lib/internal-api';

export interface AccessRequest {
  id: string;
  email: string;
  name: string;
  provider: string;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
  status: 'pending' | 'approved' | 'denied';
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

// In-memory storage for demo - replace with database in production
let accessRequests: AccessRequest[] = [];

/**
 * GET /api/admin/access-requests - Get all access requests
 */
export async function GET(req: NextRequest) {
  try {
    return await withAdminAction(
      req,
      'GET_ACCESS_REQUESTS',
      async (adminEmail) => {
        // Sort by timestamp, newest first
        const sortedRequests = accessRequests.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        return NextResponse.json({
          success: true,
          data: sortedRequests,
          total: sortedRequests.length,
          pending: sortedRequests.filter(r => r.status === 'pending').length
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
 * POST /api/admin/access-requests - Create new access request (from auth callback)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, provider, timestamp, userAgent, ipAddress } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if request already exists for this email
    const existingRequest = accessRequests.find(
      r => r.email.toLowerCase() === email.toLowerCase() && r.status === 'pending'
    );

    if (existingRequest) {
      // Update timestamp of existing request
      existingRequest.timestamp = timestamp;
      existingRequest.userAgent = userAgent || existingRequest.userAgent;
      existingRequest.ipAddress = ipAddress || existingRequest.ipAddress;
      
      return NextResponse.json({
        success: true,
        data: existingRequest,
        message: 'Updated existing request'
      });
    }

    // Create new access request
    const newRequest: AccessRequest = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      name: name || '',
      provider: provider || 'unknown',
      timestamp: timestamp || new Date().toISOString(),
      userAgent: userAgent || req.headers.get('user-agent') || 'unknown',
      ipAddress: ipAddress || req.ip || req.headers.get('x-forwarded-for') || 'unknown',
      status: 'pending'
    };

    accessRequests.push(newRequest);

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
            id: `access-request-${newRequest.id}`,
            content: `ACCESS REQUEST: ${newRequest.email} requested access at ${newRequest.timestamp}`,
            metadata: {
              type: 'access_request',
              ...newRequest
            }
          })
        });

        if (!orionResponse.ok) {
          const details = await orionResponse.text().catch(() => orionResponse.statusText);
          console.error('Failed to store access request in ORION-CORE:', details);
        }
      }
    } catch (orionError) {
      console.error('Failed to store in ORION-CORE:', orionError);
    }

    return NextResponse.json({
      success: true,
      data: newRequest,
      message: 'Access request created'
    });

  } catch (error) {
    console.error('Error creating access request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create access request' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/access-requests - Update access request status
 */
export async function PATCH(req: NextRequest) {
  try {
    // Parse body first to use in audit parameters
    const body = await req.json();
    const { id, status, notes } = body;

    return await withAdminAction(
      req,
      'UPDATE_ACCESS_REQUEST',
      async (adminEmail) => {
        // Body is already parsed above
        if (!id || !status) {
          return NextResponse.json(
            { success: false, error: 'ID and status are required' },
            { status: 400 }
          );
        }

        const request = accessRequests.find(r => r.id === id);
        if (!request) {
          return NextResponse.json(
            { success: false, error: 'Access request not found' },
            { status: 404 }
          );
        }

        // Update request
        request.status = status;
        request.reviewedBy = adminEmail;
        request.reviewedAt = new Date().toISOString();
        request.notes = notes || '';

        // If approved, add to allowed emails
        if (status === 'approved') {
          // TODO: Add to environment variable or database
          console.log(`APPROVED: Add ${request.email} to ALLOWED_EMAILS`);

          // For now, we'll store the approval in ORION-CORE
          try {
            const storeUrl = resolveInternalUrl('/api/orion/store-memory', req);

            if (!storeUrl) {
              console.error('Failed to resolve ORION-CORE store-memory endpoint');
            } else {
              const approvalResponse = await fetch(storeUrl, {
                method: 'POST',
                headers: buildInternalHeaders(req, {
                  'Content-Type': 'application/json'
                }),
                body: JSON.stringify({
                  id: `approved-user-${request.email}`,
                  content: `APPROVED USER: ${request.email} approved by ${adminEmail} at ${request.reviewedAt}`,
                  metadata: {
                    type: 'approved_user',
                    email: request.email,
                    approvedBy: adminEmail,
                    approvedAt: request.reviewedAt
                  }
                })
              });

              if (!approvalResponse.ok) {
                const details = await approvalResponse.text().catch(() => approvalResponse.statusText);
                console.error('Failed to store approval in ORION-CORE:', details);
              }
            }
          } catch (orionError) {
            console.error('Failed to store approval in ORION-CORE:', orionError);
          }
        }

        return NextResponse.json({
          success: true,
          data: request,
          message: `Access request ${status}`
        });
      },
      {
        target: `access-request-${id}`,
        details: { status, notes }
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
