# AI Marketplace - Current Production Architecture

**Last Updated**: 2025-10-15  
**Status**: ✅ Production  
**Version**: Phase 1 Security Hardening Complete

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Authentication Flow](#authentication-flow)
5. [Environment Variables](#environment-variables)
6. [Deployment Procedures](#deployment-procedures)
7. [Troubleshooting](#troubleshooting)

---

## System Overview

### Infrastructure

```
┌──────────────────────────────────────────────────────────────┐
│ Production Frontend                                          │
│ Vercel: https://www.sidekickportal.com                       │
│ Framework: Next.js 14 (App Router)                           │
│ Auth: NextAuth.js (Google OAuth + Credentials)              │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ Cloudflare CDN + Tunnel                                      │
│ - orion-chat.sidekickportal.com → 192.168.50.77:3002        │
│ - fabric.sidekickportal.com → 192.168.50.77:8089            │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ Backend Services (192.168.50.77)                             │
│                                                              │
│ 1. Chat Backend (PM2: chat-backend)                         │
│    - Directory: /opt/chat-backend/                          │
│    - Port: 3002                                             │
│    - Database: PostgreSQL (192.168.50.79:5432)              │
│    - Redis: 192.168.50.79:6379                              │
│                                                              │
│ 2. Fabric Bridge (Port 8089)                                │
│    - Fabric AI pattern execution                            │
└──────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Deployment

- **Platform**: Vercel
- **Repository**: `github.com:4NDrew-42/OFT.git`
- **Branch**: `main` (auto-deploy on push)
- **Project Path**: `sites/ai-marketplace/frontend/apps/web`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### Key Files

```
sites/ai-marketplace/frontend/apps/web/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts    # NextAuth handler
│   │   │   ├── sessions/                      # Session API proxies
│   │   │   │   ├── list/route.ts              # List sessions
│   │   │   │   ├── create/route.ts            # Create session
│   │   │   │   ├── messages/route.ts          # Get messages
│   │   │   │   └── save-message/route.ts      # Save message
│   │   │   ├── proxy/
│   │   │   │   └── chat-stream/route.ts       # SSE chat stream
│   │   │   └── debug/
│   │   │       └── auth-status/route.ts       # Auth debugging
│   │   ├── assistant/page.tsx                 # Main chat UI
│   │   └── auth/
│   │       ├── signin/page.tsx                # Sign in page
│   │       └── error/page.tsx                 # Auth error page
│   ├── lib/
│   │   ├── auth.ts                            # NextAuth config (authOptions)
│   │   ├── auth-token.ts                      # JWT minting (buildOrionJWT)
│   │   └── session/
│   │       ├── client.ts                      # Session API client
│   │       └── identity.ts                    # User ID resolution
│   └── components/
│       └── chat/
│           └── intelligent-chat.tsx           # Chat component
└── package.json
```

### Authentication

**Provider**: NextAuth.js v4  
**Strategies**:
1. Google OAuth (primary)
2. Credentials (fallback)

**Session Strategy**: JWT (stored in HTTP-only cookies)

**Single-User Authorization**:
- Only `jamesandrewklein@gmail.com` is authorized
- Enforced in `signIn` callback (`src/lib/auth.ts`)

---

## Backend Architecture

### Active Service: Chat Backend

**Location**: `/opt/chat-backend/` on `192.168.50.77`  
**PM2 Process**: `chat-backend`  
**Port**: 3002  
**Public URL**: `https://orion-chat.sidekickportal.com`

### Directory Structure

```
/opt/chat-backend/
├── server.js                    # Express server
├── .env                         # Environment variables (CRITICAL)
├── package.json
├── routes/
│   ├── sessions-api.js          # Session CRUD endpoints
│   └── chat-stream-api.js       # SSE chat streaming
├── lib/
│   └── jwt-middleware.js        # JWT verification middleware
├── db.js                        # PostgreSQL connection
└── deploy.sh                    # Deployment script
```

### API Endpoints

**Base URL**: `https://orion-chat.sidekickportal.com`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | None | Health check |
| `/api/sessions/list` | GET | JWT | List user sessions |
| `/api/sessions/create` | POST | JWT | Create new session |
| `/api/sessions/messages` | GET | JWT | Get session messages |
| `/api/sessions/save-message` | POST | JWT | Save message |
| `/api/chat-stream` | GET | JWT | SSE chat stream |

### JWT Middleware

**File**: `/opt/chat-backend/lib/jwt-middleware.js`

**Verification Steps**:
1. Extract `Authorization: Bearer <token>` header
2. Verify HS256 signature using `ORION_SHARED_JWT_SECRET`
3. Validate claims:
   - `iss` (issuer): `https://www.sidekickportal.com`
   - `aud` (audience): `orion-core`
   - `sub` (subject): User email
   - `exp` (expiration): Must be in future
4. Enforce single-user authorization: `sub` must be `jamesandrewklein@gmail.com`

---

## Authentication Flow

### End-to-End Request Flow

```
1. User visits /assistant
   ↓
2. Frontend checks NextAuth session (useSession hook)
   ↓
3. If not authenticated → redirect to /api/auth/signin
   ↓
4. User logs in with Google OAuth
   ↓
5. NextAuth creates session (cookie: next-auth.session-token)
   ↓
6. User redirected back to /assistant
   ↓
7. User sends chat message
   ↓
8. Frontend calls /api/sessions/list (with credentials: 'same-origin')
   ↓
9. Next.js API route receives request with session cookie
   ↓
10. API route calls getServerSession(authOptions)
    ↓
11. If session valid → mint ORION JWT using buildOrionJWT(userId)
    ↓
12. API route forwards to backend:
    GET https://orion-chat.sidekickportal.com/api/sessions/list
    Authorization: Bearer <JWT>
    ↓
13. Backend JWT middleware verifies token
    ↓
14. Backend processes request → returns data
    ↓
15. Frontend API route returns data to client
    ↓
16. Client renders chat UI
```

### JWT Token Structure

**Header**:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload**:
```json
{
  "iss": "https://www.sidekickportal.com",
  "aud": "orion-core",
  "sub": "jamesandrewklein@gmail.com",
  "iat": 1760515664,
  "exp": 1760515964
}
```

**Signature**: HMAC-SHA256 using `ORION_SHARED_JWT_SECRET`

---

## Environment Variables

### Frontend (Vercel)

**Critical Variables** (must be synchronized with backend):

```bash
# NextAuth Configuration
NEXTAUTH_SECRET="<64-byte-hex-string>"
NEXTAUTH_URL="https://www.sidekickportal.com"

# Google OAuth
GOOGLE_CLIENT_ID="<google-oauth-client-id>"
GOOGLE_CLIENT_SECRET="<google-oauth-client-secret>"

# ORION JWT Configuration (MUST MATCH BACKEND)
ORION_SHARED_JWT_SECRET="fdf0e0fdf7da301fe1e6b0a724c84033d65cf71caf18e6b01560970fc9d9a047fc7defa5e82147543e2a5e449e4fe8407e765cae407fc47ce20d66aaf6c3f383"
ORION_SHARED_JWT_ISS="https://www.sidekickportal.com"
ORION_SHARED_JWT_AUD="orion-core"

# Backend Service URLs
CHAT_SERVICE_URL="https://orion-chat.sidekickportal.com"
```

**How to Update**:

```bash
cd /tank/webhosting/sites/ai-marketplace/frontend/apps/web

# Add/update variable
echo -n "value" | vercel env add VARIABLE_NAME production

# Verify (pulls to local file)
vercel env pull .env.production.local --environment=production
cat .env.production.local | grep VARIABLE_NAME
rm .env.production.local

# Redeploy to apply changes
vercel redeploy <deployment-id>
```

### Backend (192.168.50.77)

**File**: `/opt/chat-backend/.env`

```bash
# ORION JWT Configuration (MUST MATCH FRONTEND)
ORION_SHARED_JWT_SECRET=fdf0e0fdf7da301fe1e6b0a724c84033d65cf71caf18e6b01560970fc9d9a047fc7defa5e82147543e2a5e449e4fe8407e765cae407fc47ce20d66aaf6c3f383
ORION_SHARED_JWT_ISS=https://www.sidekickportal.com
ORION_SHARED_JWT_AUD=orion-core

# Authorization
AUTHORIZED_USER_EMAIL=jamesandrewklein@gmail.com

# Database
DATABASE_URL=postgresql://orion_user:changeme@192.168.50.79:5432/orion_core

# Redis
REDIS_URL=redis://192.168.50.79:6379/0

# Server
PORT=3002
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200

# Logging
LOG_LEVEL=info

# Features
ENABLE_JWT_AUTH=true
```

**How to Update**:

```bash
ssh root@192.168.50.77

# Edit .env file
nano /opt/chat-backend/.env

# Restart with updated environment
cd /opt/chat-backend
pm2 restart chat-backend --update-env

# Verify it loaded
pm2 logs chat-backend --lines 20
```

---

## Deployment Procedures

### Frontend Deployment

**Automatic** (on git push to main):

```bash
cd /tank/webhosting/sites/ai-marketplace
git add .
git commit -m "feat: description"
git push origin main

# Vercel auto-deploys in ~30-60 seconds
```

**Manual** (redeploy existing build):

```bash
cd /tank/webhosting/sites/ai-marketplace/frontend/apps/web
vercel ls  # Get deployment ID
vercel redeploy <deployment-id>
```

### Backend Deployment

**Method 1: Using deploy.sh** (recommended):

```bash
ssh root@192.168.50.77
cd /opt/chat-backend
./deploy.sh
```

**Method 2: Manual**:

```bash
ssh root@192.168.50.77
cd /opt/chat-backend

# Pull latest code (if using git)
git pull origin main

# Install dependencies
npm install

# Restart PM2 process
pm2 restart chat-backend --update-env

# Verify
pm2 logs chat-backend --lines 20
curl -s https://orion-chat.sidekickportal.com/health | jq '.'
```

---

## Troubleshooting

### Issue: 401 Unauthorized on API Calls

**Symptoms**:
- Frontend shows 401 errors in console
- `/api/sessions/list` returns `{error: 'Unauthorized'}`

**Diagnosis**:

```javascript
// In browser console
fetch('/api/debug/auth-status')
  .then(r => r.json())
  .then(data => console.log(JSON.stringify(data, null, 2)));
```

**Common Causes**:

1. **Not logged in**: Session doesn't exist
   - **Fix**: Log in via `/api/auth/signin`

2. **Cookies not sent**: Missing `credentials: 'same-origin'` in fetch
   - **Fix**: Add `credentials: 'same-origin'` to all fetch calls

3. **JWT secret mismatch**: Frontend and backend have different secrets
   - **Fix**: Synchronize `ORION_SHARED_JWT_SECRET` in both environments

4. **Backend not restarted**: Old secret still in memory
   - **Fix**: `pm2 restart chat-backend --update-env`

### Issue: JWT Secret Mismatch

**Symptoms**:
- Backend returns `{error: 'Invalid token', details: 'invalid signature'}`

**Diagnosis**:

```bash
# Check frontend secret
cd /tank/webhosting/sites/ai-marketplace/frontend/apps/web
vercel env pull .env.production.local --environment=production
grep ORION_SHARED_JWT_SECRET .env.production.local | cut -d'=' -f2 | head -c 8
# Should output: fdf0e0fd

# Check backend secret
ssh root@192.168.50.77 "grep ORION_SHARED_JWT_SECRET /opt/chat-backend/.env | cut -d'=' -f2 | head -c 8"
# Should output: fdf0e0fd

# If they don't match, update backend and restart
ssh root@192.168.50.77 "
  sed -i 's/^ORION_SHARED_JWT_SECRET=.*/ORION_SHARED_JWT_SECRET=<correct-secret>/' /opt/chat-backend/.env &&
  cd /opt/chat-backend &&
  pm2 restart chat-backend --update-env
"
```

### Issue: Wrong Backend Directory

**Symptoms**:
- PM2 process running from unexpected directory
- Changes to code not taking effect

**Diagnosis**:

```bash
ssh root@192.168.50.77 "pm2 describe chat-backend | grep -E 'script path|exec cwd'"
```

**Expected Output**:
```
│ script path       │ /opt/chat-backend/server.js              │
│ exec cwd          │ /opt/chat-backend                        │
```

**If wrong directory**:

```bash
ssh root@192.168.50.77 "
  pm2 delete chat-backend &&
  cd /opt/chat-backend &&
  pm2 start server.js --name chat-backend &&
  pm2 save
"
```

---

**End of Current Architecture Guide**

