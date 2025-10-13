/**
 * ORION-CORE Chat Backend Service
 * 
 * Provides session management endpoints for chat functionality
 * Runs on port 3002 (ORACLE - 192.168.50.77)
 * Accessible via: https://orion-chat.sidekickportal.com
 * 
 * Architecture:
 * - Express.js REST API
 * - PostgreSQL for persistence (ORION-MEM 192.168.50.79)
 * - CORS enabled for sidekickportal.com domains
 * - Rate limiting for API protection
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const sessionsRouter = require('./routes/sessions-api');
const jwtMiddleware = require('./middleware/jwt-verify');

const app = express();
const PORT = process.env.PORT || 3002;

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// ============================================================================
// RATE LIMITING (TIGHTENED)
// ============================================================================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // Configurable, default 100
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// ============================================================================
// CORS CONFIGURATION (TIGHTENED)
// ============================================================================

// CRITICAL: Use environment variable for allowed origins (no wildcards in production)
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  'https://www.sidekickportal.com,https://sidekickportal.com,http://localhost:3000,http://localhost:3005'
).split(',').map(origin => origin.trim());

const corsOptions = {
  origin: function (origin, callback) {
    // CRITICAL: Only allow no-origin in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // CRITICAL: Strict origin checking - no wildcards
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('CORS Error: Origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// ============================================================================
// BODY PARSING & LOGGING
// ============================================================================

app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'orion-chat-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'postgresql://192.168.50.79:5432/orion_core'
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'ORION-CORE Chat Backend',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      sessions: {
        create: 'POST /api/sessions/create',
        list: 'GET /api/sessions/list?userId=xxx',
        get: 'GET /api/sessions/:sessionId',
        delete: 'POST /api/sessions/delete',
        messages: 'GET /api/sessions/messages?sessionId=xxx',
        saveMessage: 'POST /api/sessions/save-message'
      }
    },
    documentation: 'https://github.com/4NDrew-42/ORION-CORE'
  });
});

// ============================================================================
// API ROUTES (JWT PROTECTED)
// ============================================================================

// CRITICAL: Apply JWT verification middleware to all session routes
app.use('/api/sessions', jwtMiddleware, sessionsRouter);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /health',
      'GET /',
      'POST /api/sessions/create',
      'GET /api/sessions/list',
      'GET /api/sessions/:sessionId',
      'POST /api/sessions/delete',
      'GET /api/sessions/messages',
      'POST /api/sessions/save-message'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled chat service error:', err);
  
  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed',
      origin: req.headers.origin
    });
  }
  
  // Generic error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 ORION-CORE Chat Backend Service                       ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Port:        ${PORT}                                          ║`);
  console.log('║  Host:        0.0.0.0 (all interfaces)                     ║');
  console.log('║  Database:    PostgreSQL @ 192.168.50.79:5432              ║');
  console.log('║  Public URL:  https://orion-chat.sidekickportal.com        ║');
  console.log('║  Health:      http://localhost:3002/health                 ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Endpoints:                                                ║');
  console.log('║    POST /api/sessions/create                               ║');
  console.log('║    GET  /api/sessions/list?userId=xxx                      ║');
  console.log('║    GET  /api/sessions/:sessionId                           ║');
  console.log('║    POST /api/sessions/delete                               ║');
  console.log('║    GET  /api/sessions/messages?sessionId=xxx               ║');
  console.log('║    POST /api/sessions/save-message                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
