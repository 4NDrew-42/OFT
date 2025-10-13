# Phase 1 Security Deployment Guide

**Date**: 2025-10-13  
**Branch**: `feature/phase1-security-hardening`  
**Status**: ✅ **READY FOR PRODUCTION DEPLOYMENT**

---

## 🎯 DEPLOYMENT STATUS

### **Backend Validation**: ✅ **ALL TESTS PASS**
- Tested on port 3302 with production configuration
- All 6 security tests passed
- All 5 functional tests passed
- Full results in `PHASE1_BACKEND_VALIDATION_RESULTS.md`

### **Frontend Validation**: ✅ **READY**
- Build successful
- Environment configured
- All code complete
- Awaiting backend deployment for end-to-end testing

---

## 🚀 DEPLOYMENT PLAN

### **Current Infrastructure**

```
Public Endpoint: https://orion-chat.sidekickportal.com
    ↓ (Cloudflare Tunnel)
Target Machine: 192.168.50.77:3002
    ↓ (Currently running OLD CODE)
Old Backend Service: No Phase 1 security
```

### **Target Infrastructure**

```
Public Endpoint: https://orion-chat.sidekickportal.com
    ↓ (Cloudflare Tunnel - NO CHANGE)
Target Machine: 192.168.50.77:3002
    ↓ (Deploy Phase 1 CODE)
New Backend Service: Phase 1 security hardening
```

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### **✅ Code Ready**
- [x] Frontend security hardening complete
- [x] Backend security hardening complete
- [x] All imports fixed
- [x] Legacy URLs removed
- [x] Build successful
- [x] 7 commits on feature/phase1-security-hardening

### **✅ Configuration Ready**
- [x] Backend `.env` created with production values
- [x] Frontend `.env.local` synced with same JWT secret
- [x] 64-byte HS256 secret generated
- [x] PgBouncer host configured (192.168.50.79:6432)
- [x] Strict CORS list configured
- [x] Single-user email configured (jamesandrewklein@gmail.com)

### **✅ Testing Complete**
- [x] Backend security tests: 6/6 PASS
- [x] Backend functional tests: 5/5 PASS
- [x] Frontend build: SUCCESS
- [x] Frontend environment: CONFIGURED

---

## 🔧 DEPLOYMENT STEPS

### **Option 1: Automated Deployment** (Recommended)

```bash
cd /tank/webhosting/sites/ai-marketplace/backend/chat-service
./deploy-phase1.sh
```

**What it does**:
1. Verifies .env file exists
2. Verifies dependencies
3. Creates deployment package
4. Copies files to 192.168.50.77
5. Installs dependencies on target
6. Stops old service
7. Starts Phase 1 service
8. Verifies deployment (health check + JWT middleware)

**Expected Output**:
```
✓ .env file found
✓ Dependencies verified
✓ Package created
✓ Files copied
✓ Dependencies installed
✓ Old service stopped
✓ Phase 1 service started
✓ Health check passed
✓ JWT middleware active
```

---

### **Option 2: Manual Deployment**

#### **Step 1: Copy Files**
```bash
rsync -avz --delete \
    /tank/webhosting/sites/ai-marketplace/backend/chat-service/ \
    root@192.168.50.77:/opt/orion-chat-backend/
```

#### **Step 2: Install Dependencies**
```bash
ssh root@192.168.50.77 "cd /opt/orion-chat-backend && npm install --production"
```

#### **Step 3: Stop Old Service**
```bash
ssh root@192.168.50.77 "
    systemctl stop orion-chat-backend 2>/dev/null || true
    pm2 stop orion-chat-backend 2>/dev/null || true
    lsof -ti:3002 | xargs kill -9 2>/dev/null || true
"
```

#### **Step 4: Start Phase 1 Service**
```bash
ssh root@192.168.50.77 "
    cd /opt/orion-chat-backend
    pm2 start server.js --name orion-chat-backend --env production
    pm2 save
"
```

#### **Step 5: Verify Deployment**
```bash
# Health check
ssh root@192.168.50.77 "curl -s http://localhost:3002/health" | jq .

# JWT middleware check (should return 401)
ssh root@192.168.50.77 "curl -s -w '%{http_code}' -o /dev/null http://localhost:3002/api/sessions/list"
```

---

## ✅ POST-DEPLOYMENT VALIDATION

### **1. Backend Health Check**
```bash
curl -s https://orion-chat.sidekickportal.com/health | jq .
```

**Expected**:
```json
{
  "status": "healthy",
  "service": "orion-chat-backend",
  "version": "1.0.0",
  "timestamp": "2025-10-13T...",
  "uptime": ...,
  "database": "postgresql://192.168.50.79:6432/orion_core"
}
```

### **2. Security Tests**

Run the validation test script:
```bash
cd /tank/webhosting/sites/ai-marketplace/frontend/apps/web
./phase1-validation-tests.sh
```

**Expected Results**:
```
✓ Backend Health Check
✓ Unauthorized Access (No Auth) → 401
✓ Invalid JWT Signature → 403
✓ CORS Unauthorized Origin → blocked
✓ Rate Limiting → 429 after 100 requests
✓ Environment Configuration
✓ No Legacy Backend URLs
```

### **3. Frontend End-to-End Test**

1. Start frontend dev server:
```bash
cd /tank/webhosting/sites/ai-marketplace/frontend/apps/web
npm run dev
```

2. Open browser: `http://localhost:3000/enhanced-chat`

3. Sign in as `jamesandrewklein@gmail.com`

4. Verify:
   - ✅ Chat UI loads
   - ✅ Can create session
   - ✅ Can send messages
   - ✅ Can list sessions
   - ✅ Can delete sessions

5. Sign in as different user (e.g., `test@example.com`)

6. Verify:
   - ✅ "Access Denied" message displays
   - ✅ Cannot access chat interface

---

## 📊 VALIDATION CHECKLIST

After deployment, verify:

- [ ] Backend health endpoint returns 200
- [ ] Unauthorized requests return 401
- [ ] Invalid JWT returns 403
- [ ] Wrong user returns 403
- [ ] CORS blocks unauthorized origins
- [ ] Rate limiting triggers at 100 requests
- [ ] Authorized user can create sessions
- [ ] Authorized user can list sessions
- [ ] Authorized user can send messages
- [ ] Unauthorized user sees "Access Denied"
- [ ] No console errors in browser
- [ ] No 192.168.50.79 URLs in network tab

---

## 🔄 ROLLBACK PLAN

If deployment fails or issues are found:

### **Quick Rollback**
```bash
ssh root@192.168.50.77 "
    pm2 stop orion-chat-backend
    # Restore old service (if backed up)
    pm2 start /opt/orion-chat-backend-old/server.js --name orion-chat-backend
"
```

### **Full Rollback**
1. Stop Phase 1 service
2. Restore old service from backup
3. Verify health endpoint
4. Document issues in MCP memory
5. Fix issues on feature branch
6. Re-test and re-deploy

---

## 📝 POST-DEPLOYMENT TASKS

### **1. Update MCP Memory**
```javascript
{
  "id": "phase1-deployment-complete-20251013",
  "content": "PHASE 1 DEPLOYMENT COMPLETE\n\nDEPLOYMENT TIME: ...\nBACKEND URL: https://orion-chat.sidekickportal.com\nVALIDATION RESULTS: ...\nISSUES: ...\nNEXT STEPS: ...",
  "metadata": {
    "type": "deployment-complete",
    "priority": "P0",
    "phase": "1",
    "status": "production",
    "correlation_id": "phase1-deployment-20251013"
  }
}
```

### **2. Merge to Main**
```bash
cd /tank/webhosting/sites/ai-marketplace
git checkout main
git merge feature/phase1-security-hardening
git push origin main
```

### **3. Tag Release**
```bash
git tag -a v1.0.0-phase1-security -m "Phase 1 Security Hardening Release"
git push origin v1.0.0-phase1-security
```

### **4. Update Documentation**
- Update PM.md with security status
- Document deployment date and results
- Archive validation reports

---

## 🚨 TROUBLESHOOTING

### **Issue: Health check fails**
```bash
# Check service status
ssh root@192.168.50.77 "pm2 status"

# Check logs
ssh root@192.168.50.77 "pm2 logs orion-chat-backend --lines 50"

# Check port
ssh root@192.168.50.77 "ss -tlnp | grep 3002"
```

### **Issue: JWT middleware not working**
```bash
# Verify .env file
ssh root@192.168.50.77 "cat /opt/orion-chat-backend/.env | grep JWT"

# Check middleware is loaded
ssh root@192.168.50.77 "grep -n 'jwtMiddleware' /opt/orion-chat-backend/server.js"
```

### **Issue: Database connection fails**
```bash
# Test database connection
ssh root@192.168.50.77 "
    cd /opt/orion-chat-backend
    node -e \"
        const pool = require('./db');
        pool.query('SELECT NOW()', (err, res) => {
            if (err) console.error('DB Error:', err);
            else console.log('DB OK:', res.rows[0]);
            process.exit(0);
        });
    \"
"
```

---

## 📞 SUPPORT

**Issues or Questions?**
- Check MCP memory: `phase1-deployment-ready-20251013`
- Review validation results: `PHASE1_BACKEND_VALIDATION_RESULTS.md`
- Review frontend summary: `PHASE1_FRONTEND_VALIDATION_SUMMARY.md`
- Contact: Backend Agent or Frontend Agent via MCP

---

**Ready to deploy! All systems validated and ready for production.** 🚀

