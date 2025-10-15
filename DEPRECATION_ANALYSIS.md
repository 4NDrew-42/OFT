# AI Marketplace Backend Deprecation Analysis

**Date**: 2025-10-15  
**Author**: System Audit  
**Purpose**: Identify and document duplicate/obsolete backend services for safe deprecation

---

## Executive Summary

During troubleshooting of JWT authentication issues, we discovered **multiple duplicate backend deployments** with conflicting configurations:

- **Active Production Service**: `/opt/chat-backend/` (PM2 process: `chat-backend`)
- **Obsolete/Duplicate Service**: `/opt/orion-chat-backend/` (NOT running in PM2)
- **Repository Source**: `/tank/webhosting/sites/ai-marketplace/backend/chat-service/`

**Critical Issue**: The JWT secret mismatch occurred because:
1. Frontend was configured with secret: `fdf0e0fd...f6c3f383`
2. Backend at `/opt/chat-backend/.env` had secret: `88d9ddd8...1ac036e7` (OLD)
3. Backend at `/opt/orion-chat-backend/.env` had secret: `fdf0e0fd...f6c3f383` (CORRECT but not running)

---

## 1. Duplicate Backend Services

### 1.1 Active Production Service (CURRENT)

**Location**: `/opt/chat-backend/`  
**PM2 Process**: `chat-backend` (PID: 2738921, running since 2025-10-15T08:09:23)  
**Status**: ✅ **ACTIVE - DO NOT REMOVE**  
**Purpose**: Production chat backend serving `https://orion-chat.sidekickportal.com`

**Key Files**:
- `server.js` (9,618 bytes, modified Oct 15 00:50)
- `.env` (541 bytes, **UPDATED** Oct 15 03:09 with correct JWT secret)
- `package.json` (1,150 bytes)
- `routes/` directory
- `lib/` directory (JWT middleware in `lib/jwt-middleware.js`)

**Missing**:
- ❌ No `middleware/` directory (uses `lib/` instead)
- ❌ No dedicated `jwt-verify.js` middleware file

**Environment Variables** (`.env`):
```bash
ORION_SHARED_JWT_SECRET=fdf0e0fd...f6c3f383  # ✅ CORRECT (updated 2025-10-15)
AUTHORIZED_USER_EMAIL=jamesandrewklein@gmail.com
JWT_ISSUER=https://www.sidekickportal.com
JWT_AUDIENCE=orion-core
DATABASE_URL=postgresql://orion_user:changeme@192.168.50.79:5432/orion_core
PORT=3002
NODE_ENV=production
```

---

### 1.2 Obsolete Duplicate Service (DEPRECATED)

**Location**: `/opt/orion-chat-backend/`  
**PM2 Process**: ❌ **NOT RUNNING**  
**Status**: ⚠️ **DEPRECATED - CANDIDATE FOR ARCHIVAL**  
**Created**: Oct 14, 2025 (during Phase 1 Security Hardening)  
**Last Modified**: Oct 14 23:44

**Why It Exists**:
- Created during Phase 1 Security implementation
- Intended to be the "secured" version with JWT middleware
- Never actually deployed to PM2
- Contains correct JWT secret but was never used

**Key Differences from Active Service**:
- Has `middleware/jwt-verify.js` (3,248 bytes) - dedicated JWT verification
- Has `deploy-phase1.sh` script
- Different `server.js` implementation
- Correct JWT secret in `.env` but never loaded

**Recommendation**: 🗄️ **ARCHIVE** - Move to `/opt/deprecated/orion-chat-backend-20251014/`

---

### 1.3 Repository Source (CANONICAL)

**Location**: `/tank/webhosting/sites/ai-marketplace/backend/chat-service/`  
**Status**: ✅ **CANONICAL SOURCE - KEEP**  
**Purpose**: Git-tracked source code for chat backend

**Key Files**:
- `server.js`
- `middleware/jwt-verify.js` (JWT verification middleware)
- `deploy-phase1.sh` (deployment script)
- `routes/` directory
- `package.json`

**Recommendation**: ✅ **KEEP** - This is the source of truth

---

## 2. Other Duplicate/Backup Directories

### 2.1 Chat Backend Backups

**Location**: `/opt/chat-backend-backups/`  
**Status**: 🗄️ **ARCHIVE CANDIDATE**  
**Purpose**: Manual backups created during troubleshooting  
**Recommendation**: Move to `/opt/deprecated/chat-backend-backups-pre-20251015/`

---

### 2.2 Old ORION Directory

**Location**: `/opt/orion/`  
**Last Modified**: Aug 21 02:13 (2 months old)  
**Status**: ⚠️ **INVESTIGATE**  
**Recommendation**: Audit contents, likely safe to archive

---

## 3. Deprecation Plan

### Phase 1: Verification (DO THIS FIRST)

**Before deprecating anything, verify**:

```bash
# 1. Confirm active PM2 process
ssh root@192.168.50.77 "pm2 list | grep chat-backend"

# 2. Confirm it's using /opt/chat-backend
ssh root@192.168.50.77 "pm2 describe chat-backend | grep 'script path\|exec cwd'"

# 3. Verify production endpoint works
curl -s "https://orion-chat.sidekickportal.com/health" | jq '.'

# 4. Verify JWT authentication works
# (Test from frontend console)
fetch('/api/sessions/list', { credentials: 'same-origin' })
  .then(r => r.json())
  .then(data => console.log('Sessions:', data));
```

**Expected Results**:
- ✅ PM2 process running from `/opt/chat-backend/server.js`
- ✅ Health endpoint returns `{"status":"healthy",...}`
- ✅ Sessions API returns `{"sessions":[...],"count":N}` (not 401 error)

---

### Phase 2: Create Archive Directory

```bash
ssh root@192.168.50.77 "mkdir -p /opt/deprecated/$(date +%Y%m%d)"
```

---

### Phase 3: Archive Obsolete Services

**3.1 Archive `/opt/orion-chat-backend/`**:

```bash
ssh root@192.168.50.77 "
  mv /opt/orion-chat-backend /opt/deprecated/20251015/orion-chat-backend-phase1-unused &&
  echo 'DEPRECATED: This directory was created during Phase 1 Security Hardening but never deployed to PM2. The active service is /opt/chat-backend/. Archived on 2025-10-15.' > /opt/deprecated/20251015/orion-chat-backend-phase1-unused/DEPRECATED.txt
"
```

**3.2 Archive `/opt/chat-backend-backups/`**:

```bash
ssh root@192.168.50.77 "
  mv /opt/chat-backend-backups /opt/deprecated/20251015/chat-backend-backups-pre-phase1 &&
  echo 'DEPRECATED: Manual backups created before Phase 1 Security Hardening. Archived on 2025-10-15.' > /opt/deprecated/20251015/chat-backend-backups-pre-phase1/DEPRECATED.txt
"
```

**3.3 Investigate and possibly archive `/opt/orion/`**:

```bash
# First, check what's in it
ssh root@192.168.50.77 "ls -la /opt/orion/ && du -sh /opt/orion/"

# If obsolete, archive it
ssh root@192.168.50.77 "
  mv /opt/orion /opt/deprecated/20251015/orion-old-aug2025 &&
  echo 'DEPRECATED: Old ORION directory from August 2025. Archived on 2025-10-15.' > /opt/deprecated/20251015/orion-old-aug2025/DEPRECATED.txt
"
```

---

### Phase 4: Update Documentation

**4.1 Create `/opt/ACTIVE_SERVICES.md`**:

```markdown
# Active Production Services on 192.168.50.77

**Last Updated**: 2025-10-15

## Chat Backend Service

- **Directory**: `/opt/chat-backend/`
- **PM2 Process**: `chat-backend`
- **Port**: 3002
- **Public URL**: `https://orion-chat.sidekickportal.com`
- **Source Repository**: `/tank/webhosting/sites/ai-marketplace/backend/chat-service/`
- **Environment File**: `/opt/chat-backend/.env`
- **Deployment Script**: `/opt/chat-backend/deploy.sh`

### Critical Configuration

- JWT Secret: Synchronized with frontend (Vercel env: `ORION_SHARED_JWT_SECRET`)
- Database: PostgreSQL at `192.168.50.79:5432/orion_core`
- Redis: `192.168.50.79:6379/0`
- Authorized User: `jamesandrewklein@gmail.com`

### Restart Command

```bash
cd /opt/chat-backend && pm2 restart chat-backend --update-env
```

## Deprecated Services

See `/opt/deprecated/` for archived services.
```

---

## 4. Current Correct Architecture

### 4.1 Backend Service Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Vercel)                                           │
│ https://www.sidekickportal.com                              │
│                                                             │
│ Environment Variables:                                      │
│ - CHAT_SERVICE_URL=https://orion-chat.sidekickportal.com   │
│ - ORION_SHARED_JWT_SECRET=fdf0e0fd...f6c3f383              │
│ - ORION_SHARED_JWT_ISS=https://www.sidekickportal.com      │
│ - ORION_SHARED_JWT_AUD=orion-core                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS (Cloudflare)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare Tunnel                                           │
│ orion-chat.sidekickportal.com → 192.168.50.77:3002         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend Service (192.168.50.77)                             │
│ /opt/chat-backend/                                          │
│                                                             │
│ PM2 Process: chat-backend                                   │
│ Port: 3002                                                  │
│                                                             │
│ Environment Variables (.env):                               │
│ - ORION_SHARED_JWT_SECRET=fdf0e0fd...f6c3f383 ✅ MATCH     │
│ - DATABASE_URL=postgresql://192.168.50.79:5432/orion_core  │
│ - REDIS_URL=redis://192.168.50.79:6379/0                   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 JWT Token Flow

```
1. User logs in via NextAuth (Google OAuth)
   ↓
2. Frontend creates session (cookie: next-auth.session-token)
   ↓
3. User sends chat message
   ↓
4. Frontend API route (/api/sessions/list) receives request
   ↓
5. API route verifies NextAuth session (getServerSession)
   ↓
6. API route mints ORION JWT using buildOrionJWT(userId)
   - Uses ORION_SHARED_JWT_SECRET from Vercel env
   - Claims: iss, aud, sub, iat, exp
   ↓
7. API route forwards to backend with Authorization: Bearer <JWT>
   ↓
8. Backend JWT middleware verifies token
   - Uses ORION_SHARED_JWT_SECRET from /opt/chat-backend/.env
   - Validates signature, claims, expiration
   - Enforces single-user authorization
   ↓
9. Backend processes request and returns data
   ↓
10. Frontend API route returns data to client
```

---

## 5. Prevention: Avoiding Future Mismatches

### 5.1 Single Source of Truth for Secrets

**Problem**: JWT secret was defined in multiple places with different values.

**Solution**: Use a centralized secret management approach.

**Recommended Approach**:

1. **Store master secret in a secure location** (e.g., `/opt/secrets/orion-jwt-secret.txt`)
2. **Reference it in all deployments**:

```bash
# In deployment scripts
export ORION_SHARED_JWT_SECRET=$(cat /opt/secrets/orion-jwt-secret.txt)
```

3. **Verify synchronization before deployment**:

```bash
# Add to deploy.sh
FRONTEND_SECRET=$(vercel env pull --environment=production && grep ORION_SHARED_JWT_SECRET .env.production.local | cut -d'=' -f2)
BACKEND_SECRET=$(grep ORION_SHARED_JWT_SECRET /opt/chat-backend/.env | cut -d'=' -f2)

if [ "$FRONTEND_SECRET" != "$BACKEND_SECRET" ]; then
  echo "ERROR: JWT secret mismatch!"
  exit 1
fi
```

### 5.2 Deployment Checklist

Before deploying any backend service:

- [ ] Verify PM2 process name and directory
- [ ] Confirm `.env` file location and contents
- [ ] Test JWT secret synchronization with frontend
- [ ] Verify Cloudflare tunnel configuration
- [ ] Test health endpoint
- [ ] Test authenticated endpoint with real JWT
- [ ] Document in `/opt/ACTIVE_SERVICES.md`

---

## 6. Next Steps

1. ✅ **Verify current production is working** (Phase 1)
2. 🗄️ **Archive deprecated services** (Phase 2-3)
3. 📝 **Update documentation** (Phase 4)
4. 🔒 **Implement secret synchronization checks** (Phase 5)
5. 🧹 **Clean up repository backup files** (Phase 6)

---

## Appendix: File Inventory

### Active Production Files

```
/opt/chat-backend/
├── server.js (9,618 bytes) ✅ ACTIVE
├── .env (541 bytes) ✅ ACTIVE - CORRECT JWT SECRET
├── package.json
├── routes/
├── lib/
│   └── jwt-middleware.js
└── deploy.sh
```

### Deprecated Files (To Archive)

```
/opt/orion-chat-backend/ ⚠️ DEPRECATED
├── server.js (8,597 bytes)
├── .env (889 bytes) - Had correct secret but never used
├── middleware/
│   └── jwt-verify.js
└── deploy-phase1.sh

/opt/chat-backend-backups/ ⚠️ DEPRECATED
└── (manual backups)

/opt/orion/ ⚠️ INVESTIGATE
└── (old ORION files from Aug 2025)
```

---

**End of Deprecation Analysis**

