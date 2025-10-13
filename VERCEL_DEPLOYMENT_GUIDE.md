# Vercel Deployment Guide - AI Marketplace

**Project**: AI Marketplace (www.sidekickportal.com)  
**Status**: Phase 1 Security Hardening Complete  
**Last Updated**: 2025-10-13

---

## 🚨 CRITICAL: Required Environment Variables

The following environment variables **MUST** be configured in Vercel for the application to function correctly. Missing variables will cause 401 authentication errors.

### **1. Backend Chat Service**

```bash
CHAT_SERVICE_URL=https://orion-chat.sidekickportal.com
```

**Purpose**: URL of the secured chat backend (Phase 1 deployment)  
**Backend Location**: 192.168.50.77:3002 (via Cloudflare tunnel)  
**Required**: YES  
**Scope**: Server-side only (not prefixed with NEXT_PUBLIC)

---

### **2. JWT Authentication (Phase 1 Security)**

```bash
ORION_SHARED_JWT_SECRET=88d9ddd89f7bee6a31d02f0140064605bb1abb163875eb32c3c9f95a59cf909ef2ea2243a0e71e908b271e4b593cd6451f48f5b6b10cf690d16d2ad11ac036e7
```

**Purpose**: 64-byte HS256 secret for JWT signing  
**CRITICAL**: Must match the backend's `ORION_SHARED_JWT_SECRET` exactly  
**Required**: YES  
**Scope**: Server-side only (NEVER expose to client)  
**Security**: This is a production secret - handle with care

```bash
ORION_SHARED_JWT_AUD=orion-core
```

**Purpose**: JWT audience claim  
**Required**: YES  
**Default**: orion-core

```bash
ORION_SHARED_JWT_ISS=https://www.sidekickportal.com
```

**Purpose**: JWT issuer claim  
**Required**: YES  
**Default**: https://www.sidekickportal.com

---

### **3. Single-User Authorization**

```bash
AUTHORIZED_USER_EMAIL=jamesandrewklein@gmail.com
```

**Purpose**: Email of the only authorized user (Phase 1 single-user mode)  
**Required**: YES  
**Scope**: Server-side only  
**Note**: Case-insensitive matching

---

### **4. NextAuth Configuration**

```bash
NEXTAUTH_URL=https://www.sidekickportal.com
```

**Purpose**: Base URL for NextAuth callbacks  
**Required**: YES  
**Production**: https://www.sidekickportal.com  
**Preview**: https://your-preview-url.vercel.app

```bash
NEXTAUTH_SECRET=<your-nextauth-secret>
```

**Purpose**: NextAuth session encryption secret  
**Required**: YES  
**Generate**: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

```bash
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
```

**Purpose**: Google OAuth client ID  
**Required**: YES (for Google sign-in)

```bash
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
```

**Purpose**: Google OAuth client secret  
**Required**: YES (for Google sign-in)

---

### **5. ORION-CORE Integration (Public)**

```bash
NEXT_PUBLIC_ORION_API_URL=https://fabric.sidekickportal.com
NEXT_PUBLIC_CHAT_STREAM_URL=https://orion-chat.sidekickportal.com/api/chat-enhanced
NEXT_PUBLIC_STATUS_URL=https://fabric.sidekickportal.com/api/system-status
NEXT_PUBLIC_OCR_URL=https://fabric.sidekickportal.com/api/ocr/receipt
```

**Purpose**: Public endpoints for ORION-CORE services  
**Required**: YES  
**Scope**: Client-side (prefixed with NEXT_PUBLIC)

---

### **6. AI Provider API Keys (Optional)**

```bash
DEEPSEEK_API_KEY=<your-deepseek-api-key>
GEMINI_API_KEY=<your-gemini-api-key>
```

**Purpose**: API keys for AI providers (enhanced chat)  
**Required**: NO (optional features)  
**Scope**: Server-side only

---

## 📋 Vercel Configuration Steps

### **Step 1: Access Vercel Dashboard**

1. Go to https://vercel.com
2. Navigate to your project (ai-marketplace)
3. Click **Settings** → **Environment Variables**

---

### **Step 2: Add Required Variables**

For **EACH** environment variable listed above:

1. Click **Add New**
2. Enter the **Key** (e.g., `CHAT_SERVICE_URL`)
3. Enter the **Value** (e.g., `https://orion-chat.sidekickportal.com`)
4. Select **Environments**:
   - ✅ Production
   - ✅ Preview (optional)
   - ✅ Development (optional)
5. Click **Save**

---

### **Step 3: Critical Variables Checklist**

Before deploying, verify these variables are set:

- [ ] `CHAT_SERVICE_URL`
- [ ] `ORION_SHARED_JWT_SECRET` (64-byte hex string)
- [ ] `ORION_SHARED_JWT_AUD`
- [ ] `ORION_SHARED_JWT_ISS`
- [ ] `AUTHORIZED_USER_EMAIL`
- [ ] `NEXTAUTH_URL`
- [ ] `NEXTAUTH_SECRET`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `NEXT_PUBLIC_ORION_API_URL`
- [ ] `NEXT_PUBLIC_CHAT_STREAM_URL`
- [ ] `NEXT_PUBLIC_STATUS_URL`

---

### **Step 4: Trigger Redeployment**

After adding environment variables:

1. Go to **Deployments** tab
2. Click **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Select **Use existing Build Cache** (faster)
5. Click **Redeploy**

**OR** push a new commit to trigger automatic deployment.

---

## 🔍 Verification Steps

### **1. Check Deployment Logs**

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Check **Build Logs** for errors
4. Verify all environment variables are loaded

---

### **2. Test API Endpoints**

Open browser console on www.sidekickportal.com and check:

**Session List**:
```javascript
fetch('/api/sessions/list')
  .then(r => r.json())
  .then(console.log)
```

**Expected**: `{"sessions": [...], "count": ...}` (200 OK)  
**Error**: `{"error": "Unauthorized"}` (401) = Missing JWT secret

---

### **3. Test Chat Functionality**

1. Sign in as `jamesandrewklein@gmail.com`
2. Navigate to chat interface
3. Send a test message
4. Verify:
   - ✅ No 401 errors in console
   - ✅ Message appears in chat
   - ✅ Session is created
   - ✅ Response streams successfully

---

### **4. Test Unauthorized Access**

1. Sign in with a different email (not jamesandrewklein@gmail.com)
2. Navigate to chat interface
3. Verify:
   - ✅ "Access Denied" message displays
   - ✅ No API calls are made
   - ✅ User cannot access chat

---

## 🐛 Troubleshooting

### **Issue: 401 Unauthorized Errors**

**Symptoms**:
- API calls to `/api/sessions/*` return 401
- Console shows "Failed to get sessions"
- Chat streaming fails with EventSource error

**Cause**: Missing `ORION_SHARED_JWT_SECRET` in Vercel

**Fix**:
1. Add `ORION_SHARED_JWT_SECRET` to Vercel environment variables
2. Use the exact 64-byte secret from backend: `88d9ddd89f7bee6a31d02f0140064605bb1abb163875eb32c3c9f95a59cf909ef2ea2243a0e71e908b271e4b593cd6451f48f5b6b10cf690d16d2ad11ac036e7`
3. Redeploy

---

### **Issue: "server_not_configured" Error**

**Symptoms**:
- 500 Internal Server Error
- Console shows "server_not_configured"

**Cause**: `ORION_SHARED_JWT_SECRET` is not set

**Fix**: Same as above

---

### **Issue: JWT Signature Invalid (403)**

**Symptoms**:
- Backend returns 403 Forbidden
- Error message: "Invalid signature"

**Cause**: JWT secret mismatch between frontend and backend

**Fix**:
1. Verify frontend secret matches backend secret exactly
2. Backend secret location: `/opt/orion-chat-backend/.env` on 192.168.50.77
3. Check for typos or extra spaces
4. Redeploy after fixing

---

### **Issue: Wrong User (403)**

**Symptoms**:
- Backend returns 403 Forbidden
- Error message: "Unauthorized user"

**Cause**: User email doesn't match `AUTHORIZED_USER_EMAIL`

**Fix**:
1. Verify `AUTHORIZED_USER_EMAIL=jamesandrewklein@gmail.com` in Vercel
2. Sign in with the correct Google account
3. Check email case-sensitivity (should be case-insensitive)

---

## 📊 Environment Variable Summary

| Variable | Required | Scope | Example |
|----------|----------|-------|---------|
| `CHAT_SERVICE_URL` | ✅ YES | Server | `https://orion-chat.sidekickportal.com` |
| `ORION_SHARED_JWT_SECRET` | ✅ YES | Server | `88d9ddd89f7bee6a31d02f0140064605bb1abb163875eb32c3c9f95a59cf909ef2ea2243a0e71e908b271e4b593cd6451f48f5b6b10cf690d16d2ad11ac036e7` |
| `ORION_SHARED_JWT_AUD` | ✅ YES | Server | `orion-core` |
| `ORION_SHARED_JWT_ISS` | ✅ YES | Server | `https://www.sidekickportal.com` |
| `AUTHORIZED_USER_EMAIL` | ✅ YES | Server | `jamesandrewklein@gmail.com` |
| `NEXTAUTH_URL` | ✅ YES | Server | `https://www.sidekickportal.com` |
| `NEXTAUTH_SECRET` | ✅ YES | Server | `<32-byte hex>` |
| `GOOGLE_CLIENT_ID` | ✅ YES | Server | `<google-oauth-id>` |
| `GOOGLE_CLIENT_SECRET` | ✅ YES | Server | `<google-oauth-secret>` |
| `NEXT_PUBLIC_ORION_API_URL` | ✅ YES | Client | `https://fabric.sidekickportal.com` |
| `NEXT_PUBLIC_CHAT_STREAM_URL` | ✅ YES | Client | `https://orion-chat.sidekickportal.com/api/chat-enhanced` |
| `DEEPSEEK_API_KEY` | ❌ NO | Server | `<api-key>` |
| `GEMINI_API_KEY` | ❌ NO | Server | `<api-key>` |

---

## 🎯 Quick Fix for Current Issue

**Problem**: 401 errors on www.sidekickportal.com

**Solution**:
1. Go to Vercel → Settings → Environment Variables
2. Add `ORION_SHARED_JWT_SECRET` with value: `88d9ddd89f7bee6a31d02f0140064605bb1abb163875eb32c3c9f95a59cf909ef2ea2243a0e71e908b271e4b593cd6451f48f5b6b10cf690d16d2ad11ac036e7`
3. Add `CHAT_SERVICE_URL` with value: `https://orion-chat.sidekickportal.com`
4. Add `AUTHORIZED_USER_EMAIL` with value: `jamesandrewklein@gmail.com`
5. Redeploy

**Expected Result**: All API calls return 200 OK, chat works correctly

---

**Last Updated**: 2025-10-13  
**Status**: Phase 1 Security Complete - Awaiting Vercel Configuration

