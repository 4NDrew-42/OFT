const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const recommendationsRouter = require('./routes/recommendations');
const vectorSearchRouter = require('./routes/vector-search');
const analyticsRouter = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 4001;

// Security middleware
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3005',
      'https://www.sidekickportal.com',
      'https://sidekickportal.com',
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.trycloudflare\.com$/,
      /^https:\/\/.*\.ngrok\.io$/,
      /^https:\/\/.*\.sidekickportal\.com$/
    ];

    const isAllowed = allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') {
        return origin === pattern;
      } else {
        return pattern.test(origin);
      }
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'orion-template-ai-service',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/ai', recommendationsRouter);
app.use('/api/ai/search', vectorSearchRouter);
app.use('/api/ai/analytics', analyticsRouter);

// Notes API
app.use("/api/notes", require("./routes/notes-api"));

// Calendar API
app.use("/api/calendar", require("./routes/calendar-api"));

app.use("/api/expenses", require("./routes/expenses-api"));

app.use((err, req, res, next) => {
  console.error('Unhandled AI service error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🧠 ORION template AI service running on port ${PORT}`);
});
