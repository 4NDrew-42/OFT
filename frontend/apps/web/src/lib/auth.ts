/**
 * Authentication Utilities
 * 
 * Provides JWT token minting for API authentication using NextAuth sessions.
 * This module integrates with the NextAuth configuration to generate tokens
 * for authenticated API calls to the backend.
 * 
 * @module auth
 */

/**
 * Mint a JWT token for API authentication
 * 
 * This function generates a simple JWT-like token for the given user email.
 * In a production environment, this should be replaced with a proper JWT
 * signing mechanism using a secret key and the jsonwebtoken library.
 * 
 * @param userEmail - The email address of the authenticated user
 * @returns A promise that resolves to a JWT token string
 * 
 * @example
 * ```typescript
 * const { data: session } = useSession();
 * if (session?.user?.email) {
 *   const token = await mintJWT(session.user.email);
 *   // Use token for API calls
 * }
 * ```
 * 
 * @todo Replace with proper JWT signing using jsonwebtoken library
 * @todo Add token expiration and refresh mechanism
 * @todo Add token validation on backend
 */
export async function mintJWT(userEmail: string): Promise<string> {
  // For now, we'll use a simple base64-encoded token
  // This is NOT secure for production and should be replaced with proper JWT signing
  
  // Create a payload with user email and timestamp
  const payload = {
    email: userEmail,
    iat: Math.floor(Date.now() / 1000), // Issued at (Unix timestamp)
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // Expires in 24 hours
  };
  
  // Base64 encode the payload
  // NOTE: This is a placeholder implementation
  // In production, use proper JWT signing with a secret key
  const token = btoa(JSON.stringify(payload));
  
  return token;
}

/**
 * Decode a JWT token (placeholder implementation)
 * 
 * @param token - The JWT token to decode
 * @returns The decoded payload
 * 
 * @internal
 */
export function decodeJWT(token: string): { email: string; iat: number; exp: number } | null {
  try {
    const payload = JSON.parse(atob(token));
    return payload;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if a JWT token is expired
 * 
 * @param token - The JWT token to check
 * @returns True if the token is expired, false otherwise
 * 
 * @internal
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload) {
    return true;
  }
  
  const now = Math.floor(Date.now() / 1000);
  return now > payload.exp;
}
