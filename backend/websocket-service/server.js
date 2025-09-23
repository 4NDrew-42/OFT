/**
 * AI Marketplace WebSocket Service
 * Real-time updates for dynamic content feed and user interactions
 */

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3004;

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
      /^https:\/\/.*\.loca\.lt$/
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
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'websocket-service',
    connections: wss.clients.size,
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server
const server = require('http').createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/',
  verifyClient: (info) => {
    // Allow connections from localhost, Vercel, and production domains
    const origin = info.origin;
    return !origin ||
           origin.includes('localhost') ||
           origin.includes('vercel.app') ||
           origin.includes('sidekickportal.com') ||
           origin.includes('loca.lt') ||
           origin.includes('127.0.0.1');
  }
});

// Store active connections
const connections = new Map();

// Mock content generation
function generateMockContent(userId) {
  const contentTypes = ['product', 'trending', 'ai_curated', 'story'];
  const categories = ['Digital Art', 'Abstract', 'Portrait', 'Landscape', 'Modern'];
  const artists = ['Alex Chen', 'Maria Rodriguez', 'David Kim', 'Sarah Johnson', 'Michael Brown'];
  
  return {
    id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: contentTypes[Math.floor(Math.random() * contentTypes.length)],
    data: {
      title: `AI-Generated Artwork ${Math.floor(Math.random() * 1000)}`,
      artist: artists[Math.floor(Math.random() * artists.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      price: Math.floor(Math.random() * 1000) + 100,
      imageUrl: `/api/placeholder/400x300?text=Artwork_${Math.floor(Math.random() * 100)}`,
      description: 'Beautiful AI-generated artwork with unique style and composition'
    },
    timestamp: Date.now(),
    priority: Math.random(),
    aiScore: Math.random() * 0.3 + 0.7, // 0.7-1.0
    engagement: {
      views: Math.floor(Math.random() * 1000),
      likes: Math.floor(Math.random() * 100),
      shares: Math.floor(Math.random() * 50),
      comments: Math.floor(Math.random() * 25)
    }
  };
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId') || 'anonymous';
  const connectionId = uuidv4();
  
  console.log(`🔌 WebSocket connected: ${connectionId} (user: ${userId})`);
  
  // Store connection
  connections.set(connectionId, {
    ws,
    userId,
    connectedAt: Date.now(),
    lastActivity: Date.now()
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    data: {
      connectionId,
      userId,
      message: 'Connected to AI Marketplace real-time feed'
    }
  }));

  // Send initial content
  setTimeout(() => {
    const initialContent = Array.from({ length: 5 }, () => generateMockContent(userId));
    ws.send(JSON.stringify({
      type: 'initial_content',
      data: {
        items: initialContent,
        hasMore: true
      }
    }));
  }, 1000);

  // Set up periodic content updates
  const contentInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const newContent = generateMockContent(userId);
      ws.send(JSON.stringify({
        type: 'new_content',
        data: newContent
      }));
    }
  }, 10000); // Send new content every 10 seconds

  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`📨 Message from ${userId}:`, data.type);
      
      // Update last activity
      const connection = connections.get(connectionId);
      if (connection) {
        connection.lastActivity = Date.now();
      }

      // Handle different message types
      switch (data.type) {
        case 'request_content':
          const requestedContent = Array.from({ length: data.count || 3 }, () => generateMockContent(userId));
          ws.send(JSON.stringify({
            type: 'content_response',
            data: {
              items: requestedContent,
              requestId: data.requestId
            }
          }));
          break;
          
        case 'user_interaction':
          // Broadcast interaction to other users (optional)
          console.log(`👤 User interaction: ${data.action} on ${data.itemId}`);
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log(`🔌 WebSocket disconnected: ${connectionId}`);
    clearInterval(contentInterval);
    connections.delete(connectionId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${connectionId}:`, error);
    clearInterval(contentInterval);
    connections.delete(connectionId);
  });
});

// Cleanup inactive connections
setInterval(() => {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes
  
  connections.forEach((connection, connectionId) => {
    if (now - connection.lastActivity > timeout) {
      console.log(`🧹 Cleaning up inactive connection: ${connectionId}`);
      connection.ws.terminate();
      connections.delete(connectionId);
    }
  });
}, 60000); // Check every minute

// Start server
server.listen(PORT, () => {
  console.log(`🚀 WebSocket service running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/`);
});
