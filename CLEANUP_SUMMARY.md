# AI Marketplace - Cleanup & Deprecation Summary

**Date**: 2025-10-15  
**Status**: Ready for Execution  
**Purpose**: Clean up duplicate backend services and prevent future configuration mismatches

---

## Quick Start

### Option 1: Automated Script (Recommended)

```bash
cd /tank/webhosting/sites/ai-marketplace
./scripts/deprecate-obsolete-services.sh
```

The script will:
1. ✅ Verify production services are running correctly
2. ✅ Check JWT secret synchronization
3. ✅ Archive obsolete services to `/opt/deprecated/YYYYMMDD/`
4. ✅ Create documentation
5. ✅ Verify nothing broke

### Option 2: Manual Execution

See [DEPRECATION_ANALYSIS.md](./DEPRECATION_ANALYSIS.md) for step-by-step manual instructions.

---

## What Will Be Archived

| Service | Location | Reason | Archive Location |
|---------|----------|--------|------------------|
| orion-chat-backend | `/opt/orion-chat-backend/` | Created during Phase 1 but never deployed | `/opt/deprecated/YYYYMMDD/orion-chat-backend-phase1-unused/` |
| chat-backend-backups | `/opt/chat-backend-backups/` | Manual backups (pre-Git) | `/opt/deprecated/YYYYMMDD/chat-backend-backups-pre-phase1/` |
| orion (old) | `/opt/orion/` | Old ORION files from Aug 2025 | `/opt/deprecated/YYYYMMDD/orion-old-aug2025/` |

---

## What Will NOT Be Touched

| Service | Location | Status | Purpose |
|---------|----------|--------|---------|
| **chat-backend** | `/opt/chat-backend/` | ✅ **ACTIVE** | Production chat backend (PM2 process) |
| **chat-service** | `/tank/webhosting/sites/ai-marketplace/backend/chat-service/` | ✅ **ACTIVE** | Git repository source code |
| **frontend** | `/tank/webhosting/sites/ai-marketplace/frontend/` | ✅ **ACTIVE** | Next.js frontend (Vercel) |

---

## Problem This Solves

### Before Cleanup

```
/opt/
├── chat-backend/              ← PM2 running from here
│   └── .env (JWT secret: 88d9ddd8...) ❌ WRONG SECRET
├── orion-chat-backend/        ← NOT running
│   └── .env (JWT secret: fdf0e0fd...) ✅ CORRECT SECRET (but not used)
└── chat-backend-backups/      ← Old manual backups
```

**Result**: JWT secret mismatch → 401 errors

### After Cleanup

```
/opt/
├── chat-backend/              ← PM2 running from here
│   └── .env (JWT secret: fdf0e0fd...) ✅ CORRECT SECRET
└── deprecated/
    └── 20251015/
        ├── orion-chat-backend-phase1-unused/
        ├── chat-backend-backups-pre-phase1/
        └── orion-old-aug2025/
```

**Result**: Single source of truth → No more mismatches

---

## Documentation Created

1. **[DEPRECATION_ANALYSIS.md](./DEPRECATION_ANALYSIS.md)**
   - Detailed analysis of duplicate services
   - Why they exist and why they're being deprecated
   - Step-by-step manual deprecation instructions

2. **[CURRENT_ARCHITECTURE.md](./CURRENT_ARCHITECTURE.md)**
   - Complete production architecture documentation
   - Environment variables reference
   - Deployment procedures
   - Troubleshooting guide

3. **[scripts/deprecate-obsolete-services.sh](./scripts/deprecate-obsolete-services.sh)**
   - Automated deprecation script with safety checks
   - Verifies production before and after archival
   - Creates archive documentation

4. **`/opt/ACTIVE_SERVICES.md`** (created by script)
   - Quick reference for active services on 192.168.50.77
   - Restart commands and health checks

---

## Safety Features

The deprecation script includes multiple safety checks:

- ✅ Verifies PM2 process is running
- ✅ Verifies PM2 is using correct directory (`/opt/chat-backend/`)
- ✅ Verifies health endpoint responds
- ✅ Verifies JWT secrets are synchronized
- ✅ Requires user confirmation before archival
- ✅ Re-verifies production after archival
- ✅ Exits immediately on any error

---

## Rollback Plan

If something goes wrong, archived services can be restored:

```bash
ssh root@192.168.50.77

# List archived services
ls -la /opt/deprecated/YYYYMMDD/

# Restore a service (example)
mv /opt/deprecated/YYYYMMDD/orion-chat-backend-phase1-unused /opt/orion-chat-backend

# Restart PM2 if needed
cd /opt/chat-backend
pm2 restart chat-backend --update-env
```

---

## Post-Cleanup Verification

After running the script, verify everything works:

### 1. Backend Health Check

```bash
curl -s https://orion-chat.sidekickportal.com/health | jq '.'
```

**Expected**:
```json
{
  "status": "healthy",
  "service": "orion-chat-backend",
  "secured": true,
  "jwtEnabled": true
}
```

### 2. Frontend Authentication

Open browser console at `https://www.sidekickportal.com/assistant`:

```javascript
fetch('/api/debug/auth-status')
  .then(r => r.json())
  .then(data => console.log(JSON.stringify(data, null, 2)));
```

**Expected**:
```json
{
  "session": {
    "exists": true,
    "hasUser": true,
    "hasEmail": true,
    "email": "jamesandrewklein@gmail.com"
  },
  "diagnosis": [
    "✅ Session exists - user IS logged in"
  ]
}
```

### 3. Session API

```javascript
fetch('/api/sessions/list', { credentials: 'same-origin' })
  .then(r => r.json())
  .then(data => console.log('Sessions:', data));
```

**Expected**:
```json
{
  "sessions": [...],
  "count": N
}
```

**NOT**:
```json
{
  "error": "Unauthorized",
  "message": "Invalid token",
  "details": "invalid signature"
}
```

---

## Future Prevention

### 1. Single Source of Truth for Secrets

**Before deploying**, verify secrets match:

```bash
# Check frontend
cd /tank/webhosting/sites/ai-marketplace/frontend/apps/web
vercel env pull .env.production.local --environment=production --yes
FRONTEND_SECRET=$(grep ORION_SHARED_JWT_SECRET .env.production.local | cut -d'=' -f2 | tr -d '"')
rm .env.production.local

# Check backend
BACKEND_SECRET=$(ssh root@192.168.50.77 "grep ORION_SHARED_JWT_SECRET /opt/chat-backend/.env | cut -d'=' -f2")

# Compare
if [ "$FRONTEND_SECRET" = "$BACKEND_SECRET" ]; then
  echo "✅ Secrets match"
else
  echo "❌ Secrets DO NOT match!"
  echo "Frontend: ${FRONTEND_SECRET:0:8}..."
  echo "Backend:  ${BACKEND_SECRET:0:8}..."
fi
```

### 2. Deployment Checklist

Before deploying backend changes:

- [ ] Verify PM2 process name: `chat-backend`
- [ ] Verify PM2 directory: `/opt/chat-backend/`
- [ ] Verify `.env` file location: `/opt/chat-backend/.env`
- [ ] Verify JWT secret matches frontend
- [ ] Test health endpoint
- [ ] Test authenticated endpoint
- [ ] Update `/opt/ACTIVE_SERVICES.md`

### 3. Documentation Updates

Keep these files up-to-date:

- `sites/ai-marketplace/CURRENT_ARCHITECTURE.md` - Production architecture
- `/opt/ACTIVE_SERVICES.md` - Active services on 192.168.50.77
- `sites/ai-marketplace/backend/chat-service/README.md` - Service-specific docs

---

## Timeline

| Date | Event | Status |
|------|-------|--------|
| 2025-10-14 | Phase 1 Security Hardening implemented | ✅ Complete |
| 2025-10-14 | `/opt/orion-chat-backend/` created (not deployed) | ⚠️ Unused |
| 2025-10-15 | JWT secret mismatch discovered | 🐛 Bug |
| 2025-10-15 | `/opt/chat-backend/.env` updated with correct secret | ✅ Fixed |
| 2025-10-15 | Deprecation analysis and cleanup scripts created | ✅ Ready |
| 2025-10-15 | **Cleanup execution** (pending) | ⏳ Pending |

---

## Next Steps

1. **Review Documentation**
   - Read [DEPRECATION_ANALYSIS.md](./DEPRECATION_ANALYSIS.md)
   - Read [CURRENT_ARCHITECTURE.md](./CURRENT_ARCHITECTURE.md)

2. **Run Deprecation Script**
   ```bash
   cd /tank/webhosting/sites/ai-marketplace
   ./scripts/deprecate-obsolete-services.sh
   ```

3. **Verify Production**
   - Test health endpoint
   - Test authentication
   - Test chat functionality

4. **Commit Documentation**
   ```bash
   cd /tank/webhosting/sites/ai-marketplace
   git add DEPRECATION_ANALYSIS.md CURRENT_ARCHITECTURE.md CLEANUP_SUMMARY.md scripts/
   git commit -m "docs: Add deprecation analysis and cleanup scripts"
   git push origin main
   ```

5. **Update PM.md** (if exists)
   - Document cleanup completion
   - Update architecture section

---

## Questions?

- **What if the script fails?** - It will exit immediately and show the error. Nothing will be archived.
- **Can I undo the archival?** - Yes, archived services are moved to `/opt/deprecated/YYYYMMDD/` and can be restored.
- **Will this affect production?** - No, the script only archives unused services. Active services are verified before and after.
- **How long does it take?** - ~30 seconds (mostly verification checks)

---

**Ready to clean up? Run the script!**

```bash
cd /tank/webhosting/sites/ai-marketplace
./scripts/deprecate-obsolete-services.sh
```

