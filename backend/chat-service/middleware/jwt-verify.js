/**
 * JWT Verification Middleware
 * 
 * Verifies HS256 JWT tokens and enforces single-user authorization.
 * CRITICAL: Only authorized user can access the system.
 */

const crypto = require('crypto');

const AUTHORIZED_USER = (process.env.AUTHORIZED_USER_EMAIL || 'jamesandrewklein@gmail.com').toLowerCase();

/**
 * Verify JWT token signature and claims
 * 
 * @param {string} token - JWT token to verify
 * @param {string} secret - HS256 secret key
 * @returns {object} Decoded JWT payload
 * @throws {Error} If token is invalid
 */
function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  
  // Verify signature
  const data = `${headerB64}.${payloadB64}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  
  if (signatureB64 !== expectedSig) {
    throw new Error('Invalid signature');
  }
  
  // Decode payload
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  
  // Verify required claims
  const requiredIss = process.env.ORION_SHARED_JWT_ISS || 'https://www.sidekickportal.com';
  const requiredAud = process.env.ORION_SHARED_JWT_AUD || 'orion-core';
  
  if (payload.iss !== requiredIss) {
    throw new Error(`Invalid issuer: expected ${requiredIss}, got ${payload.iss}`);
  }
  
  if (payload.aud !== requiredAud) {
    throw new Error(`Invalid audience: expected ${requiredAud}, got ${payload.aud}`);
  }
  
  // Verify expiration
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) {
    throw new Error('Token expired');
  }
  
  // CRITICAL: Verify single-user authorization
  if (!payload.sub) {
    throw new Error('Missing subject claim');
  }
  
  const tokenUser = payload.sub.toLowerCase();
  if (tokenUser !== AUTHORIZED_USER) {
    throw new Error(`Unauthorized user: ${payload.sub} (only ${AUTHORIZED_USER} is authorized)`);
  }
  
  return payload;
}

/**
 * Express middleware for JWT verification
 * 
 * Verifies Authorization header and attaches payload to req.jwtPayload
 */
module.exports = function jwtMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Missing or invalid Authorization header',
      message: 'Authorization header must be in format: Bearer <token>'
    });
  }
  
  const token = authHeader.substring(7);
  const secret = process.env.ORION_SHARED_JWT_SECRET;
  
  if (!secret) {
    console.error('CRITICAL: ORION_SHARED_JWT_SECRET not configured');
    return res.status(500).json({ 
      error: 'Server not configured',
      message: 'JWT secret not set'
    });
  }
  
  try {
    req.jwtPayload = verifyJWT(token, secret);
    
    // Log successful authentication (for audit)
    console.log(`[JWT] Authenticated: ${req.jwtPayload.sub} - ${req.method} ${req.path}`);
    
    next();
  } catch (error) {
    console.warn(`[JWT] Verification failed: ${error.message}`);
    return res.status(403).json({ 
      error: 'Invalid token',
      message: error.message
    });
  }
};

