# ORION-CORE Chat Backend Service

Production-grade chat session management backend for ORION-CORE.

## Overview

- **Service**: Chat session and message persistence
- **Port**: 3002
- **Host**: ORACLE (192.168.50.77)
- **Database**: PostgreSQL @ ORION-MEM (192.168.50.79:5432)
- **Public URL**: https://orion-chat.sidekickportal.com
- **Frontend**: https://www.sidekickportal.com

## Architecture

```
Frontend (Vercel)
    ↓
Cloudflare Tunnel (orion-chat.sidekickportal.com)
    ↓
Chat Backend (ORACLE:3002)
    ↓
PostgreSQL (ORION-MEM:5432)
```

## Features

- ✅ Session management (create, list, get, delete)
- ✅ Message persistence (save, retrieve)
- ✅ User-based session filtering
- ✅ Date range filtering
- ✅ CORS enabled for sidekickportal.com
- ✅ Rate limiting (200 req/15min)
- ✅ Helmet security headers
- ✅ Comprehensive error handling
- ✅ Health check endpoint

## API Endpoints

### Health Check
```bash
GET /health
```

### Create Session
```bash
POST /api/sessions/create
Content-Type: application/json

{
  "userId": "user_123",
  "firstMessage": "Hello, ORION!"
}
```

### List Sessions
```bash
GET /api/sessions/list?userId=user_123&limit=50&sortBy=updatedAt&sortOrder=desc
```

Query parameters:
- `userId` (required): User identifier
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `limit` (optional): Max results (default: 100)
- `sortBy` (optional): 'createdAt' | 'updatedAt' (default: 'updatedAt')
- `sortOrder` (optional): 'asc' | 'desc' (default: 'desc')

### Get Session
```bash
GET /api/sessions/:sessionId
```

### Delete Session
```bash
POST /api/sessions/delete
Content-Type: application/json

{
  "sessionId": "session_123"
}
```

### Get Messages
```bash
GET /api/sessions/messages?sessionId=session_123
```

### Save Message
```bash
POST /api/sessions/save-message
Content-Type: application/json

{
  "sessionId": "session_123",
  "role": "user",
  "content": "What is ORION-CORE?",
  "metadata": {}
}
```

## Installation

### 1. Install Dependencies
```bash
cd /tank/webhosting/sites/ai-marketplace/backend/chat-service
npm install
```

### 2. Run Database Migration
```bash
npm run migrate
```

Or manually:
```bash
ssh root@192.168.50.79
PGPASSWORD=changeme psql -h localhost -U orion -d orion_core -f /path/to/migrations/001_create_chat_tables.sql
```

### 3. Start Service
```bash
# Development
npm run dev

# Production
npm start
```

## Deployment

### Option A: PM2 (Recommended)
```bash
# On ORACLE (192.168.50.77)
cd /tank/webhosting/sites/ai-marketplace/backend/chat-service
npm install
npm run migrate

# Start with PM2
pm2 start server.js --name chat-backend
pm2 save
pm2 startup
```

### Option B: systemd
```bash
# Create systemd service
sudo tee /etc/systemd/system/chat-backend.service << 'SYSTEMD'
[Unit]
Description=ORION-CORE Chat Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/tank/webhosting/sites/ai-marketplace/backend/chat-service
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/chat-backend.log
StandardError=append:/var/log/chat-backend-error.log

Environment=NODE_ENV=production
Environment=PORT=3002
Environment=DB_HOST=192.168.50.79
Environment=DB_PORT=5432
Environment=DB_NAME=orion_core
Environment=DB_USER=orion
Environment=DB_PASSWORD=changeme

[Install]
WantedBy=multi-user.target
SYSTEMD

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable chat-backend
sudo systemctl start chat-backend
sudo systemctl status chat-backend
```

### Option C: tmux (Development)
```bash
tmux new-session -d -s chat-backend "cd /tank/webhosting/sites/ai-marketplace/backend/chat-service && npm start 2>&1 | tee /tmp/chat-backend.log"
tmux attach -t chat-backend
```

## Verification

### 1. Check Service is Running
```bash
# On ORACLE
netstat -tlnp | grep :3002
# OR
ss -tlnp | grep :3002
```

### 2. Test Health Endpoint
```bash
curl http://localhost:3002/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "orion-chat-backend",
  "version": "1.0.0",
  "timestamp": "2025-10-06T...",
  "uptime": 123.45,
  "database": "postgresql://192.168.50.79:5432/orion_core"
}
```

### 3. Test CORS Headers
```bash
curl -H "Origin: https://www.sidekickportal.com" \
     -I http://localhost:3002/health
```

Should include:
```
Access-Control-Allow-Origin: https://www.sidekickportal.com
Access-Control-Allow-Credentials: true
```

### 4. Test Session Creation
```bash
curl -X POST http://localhost:3002/api/sessions/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user","firstMessage":"Hello ORION"}'
```

### 5. Test from Frontend
```bash
# In browser console at https://www.sidekickportal.com
fetch('https://orion-chat.sidekickportal.com/api/sessions/list?userId=test_user')
  .then(r => r.json())
  .then(console.log)
```

## Database Schema

### chat_sessions
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(500),
  first_message TEXT,
  last_message TEXT,
  message_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### chat_messages
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id VARCHAR(255) UNIQUE NOT NULL,
  session_id VARCHAR(255) NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Monitoring

### View Logs
```bash
# PM2
pm2 logs chat-backend

# systemd
sudo journalctl -u chat-backend -f

# tmux
tmux attach -t chat-backend
```

### Check Database
```bash
ssh root@192.168.50.79
PGPASSWORD=changeme psql -h localhost -U orion -d orion_core

-- Check sessions
SELECT COUNT(*) FROM chat_sessions;
SELECT * FROM chat_sessions ORDER BY updated_at DESC LIMIT 10;

-- Check messages
SELECT COUNT(*) FROM chat_messages;
SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 10;
```

## Troubleshooting

### Service Won't Start
```bash
# Check if port is already in use
netstat -tlnp | grep :3002

# Check database connection
PGPASSWORD=changeme psql -h 192.168.50.79 -U orion -d orion_core -c "SELECT 1;"

# Check logs
tail -f /tmp/chat-backend.log
```

### CORS Errors
```bash
# Verify CORS headers
curl -H "Origin: https://www.sidekickportal.com" -I http://localhost:3002/health

# Check allowed origins in server.js
grep -A 10 "allowedOrigins" server.js
```

### Database Errors
```bash
# Verify tables exist
PGPASSWORD=changeme psql -h 192.168.50.79 -U orion -d orion_core -c "\dt chat_*"

# Re-run migration
npm run migrate
```

## Security

- ✅ Helmet security headers
- ✅ Rate limiting (200 req/15min per IP)
- ✅ CORS whitelist (only sidekickportal.com domains)
- ✅ Input validation on all endpoints
- ✅ SQL injection protection (parameterized queries)
- ✅ Error message sanitization in production

## Performance

- Connection pooling (max 20 connections)
- Indexed queries (user_id, created_at, updated_at)
- Efficient pagination with LIMIT
- Cascade deletes for cleanup

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Message search functionality
- [ ] Session archiving
- [ ] Analytics and usage metrics
- [ ] Message attachments support
- [ ] Session sharing/collaboration

## Support

- **Documentation**: This README
- **Issues**: GitHub Issues
- **Logs**: `/tmp/chat-backend.log` or PM2/systemd logs
- **Database**: PostgreSQL @ 192.168.50.79:5432

---

**Version**: 1.0.0
**Last Updated**: 2025-10-06
**Maintainer**: ORION-CORE Team
