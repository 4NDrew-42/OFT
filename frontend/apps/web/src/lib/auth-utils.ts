import { getServerSession } from "next-auth/next";
import { NextRequest } from "next/server";

import { buildInternalHeaders, resolveInternalUrl } from "@/lib/internal-api";

// Admin email addresses - only these users have admin privileges
const ADMIN_EMAILS = [
  "jamesandrewklein@gmail.com",
  // Add more admin emails here as needed
];

export interface UserRole {
  email: string;
  role: 'admin' | 'user';
  permissions: string[];
}

export interface AdminSession {
  user: {
    email: string;
    name: string;
    role: 'admin' | 'user';
    permissions: string[];
  };
}

/**
 * Check if an email has admin privileges
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Get user role and permissions based on email
 */
export function getUserRole(email: string | null | undefined): UserRole {
  if (!email) {
    return {
      email: '',
      role: 'user',
      permissions: []
    };
  }

  const isAdmin = isAdminEmail(email);
  
  return {
    email: email.toLowerCase(),
    role: isAdmin ? 'admin' : 'user',
    permissions: isAdmin ? [
      'admin:read',
      'admin:write',
      'users:manage',
      'analytics:view',
      'system:monitor',
      'requests:approve',
      'audit:view'
    ] : [
      'chat:use',
      'status:view'
    ]
  };
}

/**
 * Server-side admin authentication check
 */
export async function requireAdmin(req?: NextRequest): Promise<AdminSession> {
  const session = await getServerSession();
  
  if (!session?.user?.email) {
    throw new Error('Authentication required');
  }

  const userRole = getUserRole(session.user.email);
  
  if (userRole.role !== 'admin') {
    throw new Error('Admin privileges required');
  }

  return {
    user: {
      email: session.user.email,
      name: session.user.name || '',
      role: userRole.role,
      permissions: userRole.permissions
    }
  };
}

/**
 * Check if user has specific permission
 */
export function hasPermission(userRole: UserRole, permission: string): boolean {
  return userRole.permissions.includes(permission);
}

/**
 * Admin action audit log entry
 */
export interface AdminAuditLog {
  id: string;
  adminEmail: string;
  action: string;
  target?: string;
  details?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log admin actions for audit trail
 */
export async function logAdminAction(
  adminEmail: string,
  action: string,
  target?: string,
  details?: Record<string, any>,
  req?: NextRequest
): Promise<void> {
  const auditEntry: AdminAuditLog = {
    id: crypto.randomUUID(),
    adminEmail,
    action,
    ...(target && { target }),
    ...(details && { details }),
    timestamp: new Date(),
    ipAddress: req?.ip || req?.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req?.headers.get('user-agent') || 'unknown'
  };

  // TODO: Store in database or logging service
  console.log('ADMIN_AUDIT:', JSON.stringify(auditEntry, null, 2));
  
  // For now, we'll store in ORION-CORE memory
  try {
    const auditUrl = resolveInternalUrl('/api/admin/audit-log', req);

    if (!auditUrl) {
      console.error('Failed to resolve base URL for admin audit logging');
      return;
    }

    const headers = buildInternalHeaders(req, {
      'Content-Type': 'application/json'
    });

    const response = await fetch(auditUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(auditEntry)
    });
    
    if (!response.ok) {
      console.error('Failed to store audit log:', response.statusText);
    }
  } catch (error) {
    console.error('Error storing audit log:', error);
  }
}

/**
 * Rate limiting for admin operations
 */
const adminRateLimits = new Map<string, { count: number; resetTime: number }>();

export function checkAdminRateLimit(
  adminEmail: string, 
  operation: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000
): boolean {
  const key = `${adminEmail}:${operation}`;
  const now = Date.now();
  const limit = adminRateLimits.get(key);

  if (!limit || now > limit.resetTime) {
    adminRateLimits.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (limit.count >= maxRequests) {
    return false;
  }

  limit.count++;
  return true;
}

/**
 * Admin notification system
 */
export interface AdminNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

/**
 * Send notification to admin
 */
export async function sendAdminNotification(
  type: AdminNotification['type'],
  title: string,
  message: string,
  actionUrl?: string
): Promise<void> {
  const notification: AdminNotification = {
    id: crypto.randomUUID(),
    type,
    title,
    message,
    timestamp: new Date(),
    read: false,
    ...(actionUrl && { actionUrl })
  };

  // TODO: Implement real-time notification system
  console.log('ADMIN_NOTIFICATION:', notification);
}
