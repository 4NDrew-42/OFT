/**
 * Single-User Identity Resolution
 * 
 * Enforces single-user authorization for the chat system.
 * Only the authorized user email can access the system.
 * 
 * @module session/identity
 */

const AUTHORIZED_USER = (process.env.NEXT_PUBLIC_AUTHORIZED_USER_EMAIL || 'jamesandrewklein@gmail.com').toLowerCase();

/**
 * Resolve and validate stable user ID from session email
 * 
 * @param sessionEmail - Email from NextAuth session
 * @returns Normalized user ID (lowercase email)
 * @throws Error if no email provided or email not authorized
 */
export function resolveStableUserId(sessionEmail: string | null | undefined): string {
  if (!sessionEmail) {
    throw new Error('No session email provided');
  }
  
  const normalized = sessionEmail.toLowerCase().trim();
  
  if (normalized !== AUTHORIZED_USER) {
    throw new Error('Unauthorized user - access restricted to authorized users only');
  }
  
  return normalized;
}

/**
 * Check if an email is the authorized user (without throwing)
 * 
 * @param email - Email to check
 * @returns True if email matches authorized user
 */
export function isAuthorizedUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === AUTHORIZED_USER;
}

/**
 * Get the authorized user email (for display purposes)
 * 
 * @returns The authorized user email
 */
export function getAuthorizedUserEmail(): string {
  return AUTHORIZED_USER;
}

