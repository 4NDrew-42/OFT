# FRONTEND AGENT ALIGNMENT PROMPT

## 🚨 CRITICAL CONTEXT - READ FIRST

You are working on the **AI Marketplace Frontend** - a Next.js 14 application deployed on Vercel.

**Current Issue**: Chat messages are not receiving responses in the browser.

**Evidence**:
- ✅ Backend is working (PM2 logs show HTTP 200 responses)
- ✅ All services are online
- ❌ Browser shows: "Failed to get subsystem status for purpose {rejected: true, message: 'UNSUPPORTED_OS'}"
- ❌ No chat responses visible in UI

---

## 📁 PROJECT STRUCTURE

**Repository Root**: `/tank/webhosting/sites/ai-marketplace/frontend`

**Key Directories**:
```
frontend/
├── apps/
│   └── web/                          # Main Next.js application
│       ├── src/
│       │   ├── app/
│       │   │   ├── assistant/        # Assistant page
│       │   │   │   └── page.tsx      # Main assistant page component
│       │   │   └── api/
│       │   │       └── proxy/
│       │   │           └── chat-stream/
│       │   │               └── route.ts  # SSE proxy endpoint
│       │   ├── components/
│       │   │   └── chat/
│       │   │       └── intelligent-chat.tsx  # Main chat component
│       │   ├── hooks/
│       │   │   └── useEnhancedChatStream.ts  # SSE streaming hook
│       │   └── lib/
│       │       ├── auth.ts           # NextAuth configuration
│       │       └── auth-token.ts     # JWT token builder
│       └── public/
│           ├── chat-debug.html       # Diagnostic tool (just created)
│           └── firefox-sse-test.html # Firefox diagnostic (just created)
└── package.json
```

---

## 🔧 CRITICAL FILES TO INVESTIGATE

### 1. **IntelligentChat Component**
**Path**: `apps/web/src/components/chat/intelligent-chat.tsx`

**What to check**:
- How does it handle the SSE stream from `useEnhancedChatStream`?
- Is it updating state when messages arrive?
- Are there any error handlers that might be swallowing errors?
- Is there a "subsystem status" check that's failing?

**Search for**:
- `subsystem`
- `UNSUPPORTED_OS`
- `content-script`
- Error handling in the component

### 2. **useEnhancedChatStream Hook**
**Path**: `apps/web/src/hooks/useEnhancedChatStream.ts`

**What to check**:
- Is the EventSource being created correctly?
- Is it handling `onmessage` events?
- Is it handling `onerror` events?
- Is it updating the state that the component reads?

**Search for**:
- `EventSource`
- `onmessage`
- `onerror`
- State updates

### 3. **Chat Stream Proxy Route**
**Path**: `apps/web/src/app/api/proxy/chat-stream/route.ts`

**Status**: ✅ Already fixed with Firefox SSE patch (needs deployment)

**What was fixed**:
- Added immediate connection acknowledgment: `controller.enqueue(encoder.encode(': connected\n\n'));`

### 4. **Assistant Page**
**Path**: `apps/web/src/app/assistant/page.tsx`

**What to check**:
- Is it properly rendering the IntelligentChat component?
- Are there any conditional renders that might hide the chat?
- Is there error handling that might be interfering?

---

## 🐛 THE ERROR MESSAGE

**Error**: `Failed to get subsystem status for purpose {rejected: true, message: 'UNSUPPORTED_OS'}`

**Source**: `content-script.js:104`

**Analysis**:
- This is NOT a Next.js error
- This is likely from a browser extension or injected script
- The term "subsystem status" suggests it's trying to check system capabilities
- "UNSUPPORTED_OS" suggests it's doing OS detection

**Possible Sources**:
1. Browser extension (Augment, Grammarly, etc.)
2. Injected content script
3. Third-party library in the frontend
4. Service worker

**Action Required**:
1. Search the entire codebase for "subsystem" or "content-script"
2. Check if there's a service worker registered
3. Check if there's any OS detection code
4. Check browser extensions that might be interfering

---

## 🔍 DIAGNOSTIC STEPS FOR FRONTEND AGENT

### Step 1: Search for the Error Source

```bash
cd /tank/webhosting/sites/ai-marketplace/frontend

# Search for "subsystem"
grep -r "subsystem" apps/web/src/ --include="*.ts" --include="*.tsx" --include="*.js"

# Search for "content-script"
grep -r "content-script" apps/web/src/ --include="*.ts" --include="*.tsx" --include="*.js"

# Search for "UNSUPPORTED_OS"
grep -r "UNSUPPORTED_OS" apps/web/src/ --include="*.ts" --include="*.tsx" --include="*.js"

# Check for service workers
find apps/web -name "*worker*" -o -name "*sw.js"
```

### Step 2: Examine IntelligentChat Component

```bash
# View the component
cat apps/web/src/components/chat/intelligent-chat.tsx

# Look for error handling
grep -A 5 -B 5 "catch\|error\|Error" apps/web/src/components/chat/intelligent-chat.tsx
```

### Step 3: Examine useEnhancedChatStream Hook

```bash
# View the hook
cat apps/web/src/hooks/useEnhancedChatStream.ts

# Look for EventSource handling
grep -A 10 "EventSource\|onmessage\|onerror" apps/web/src/hooks/useEnhancedChatStream.ts
```

### Step 4: Check for Browser Extension Interference

**Manual Check Required**:
1. Open browser DevTools (F12)
2. Go to Sources tab
3. Look for "content-script.js" in the file tree
4. Check which extension it belongs to
5. Disable that extension and test again

### Step 5: Test with Diagnostic Tool

```bash
# The diagnostic tool is already created at:
# https://www.sidekickportal.com/chat-debug.html

# This tool bypasses the IntelligentChat component
# If it works, the issue is in the component
# If it doesn't work, the issue is in the SSE proxy or backend
```

---

## 🎯 EXPECTED FINDINGS

### Scenario A: Error is from Browser Extension
**Evidence**: `content-script.js` is from a browser extension  
**Solution**: Disable the extension or add error handling to ignore it  
**Action**: No code changes needed, just user configuration

### Scenario B: Error is from Frontend Code
**Evidence**: `grep` finds "subsystem" in the codebase  
**Solution**: Fix the code that's checking subsystem status  
**Action**: Identify and fix the problematic code

### Scenario C: Error is Unrelated to Chat Issue
**Evidence**: Chat-debug.html tool also doesn't work  
**Solution**: The real issue is in the SSE proxy or EventSource handling  
**Action**: Fix the useEnhancedChatStream hook or chat-stream route

---

## �� IMMEDIATE ACTIONS

### Action 1: Search for Error Source
Run the grep commands above to find where "subsystem" appears in the code.

### Action 2: Examine IntelligentChat Component
Look for any code that might be checking system capabilities or OS.

### Action 3: Check Browser Extensions
Identify which extension is injecting `content-script.js`.

### Action 4: Test Diagnostic Tool
Have the user test https://www.sidekickportal.com/chat-debug.html to see if the issue is component-specific.

### Action 5: Deploy Vercel Fix
The Firefox SSE fix needs to be deployed:
```bash
cd /tank/webhosting/sites/ai-marketplace/frontend
vercel --prod
```

---

## 📊 BACKEND ARCHITECTURE (For Context)

**Chat Request Flow**:
```
Browser (IntelligentChat)
  ↓ useEnhancedChatStream
  ↓ GET /api/proxy/chat-stream?q=MESSAGE&sub=EMAIL
  ↓
Next.js API Route (Vercel)
  ↓ Authenticates with NextAuth
  ↓ Builds ORION JWT token
  ↓ POST https://orion-chat.sidekickportal.com/api/chat-stream-v2
  ↓
Cloudflare Tunnel
  ↓ Routes to 192.168.50.77:3002
  ↓
ORACLE Chat Backend (PM2)
  ✅ Working (confirmed by logs)
  ↓ Returns SSE stream (JSON events)
  ↓
Next.js Proxy
  ↓ Transforms JSON events → plain text SSE
  ↓
Browser EventSource
  ❌ Not displaying (THIS IS THE ISSUE)
```

**Backend Status**: ✅ CONFIRMED WORKING
**Frontend Status**: ❌ NEEDS INVESTIGATION

---

## 🔑 KEY QUESTIONS TO ANSWER

1. **Where is "subsystem" mentioned in the code?**
   - Run: `grep -r "subsystem" apps/web/src/`

2. **Is content-script.js from a browser extension?**
   - Check: Browser DevTools → Sources → content-script.js

3. **Does the chat-debug.html tool work?**
   - Test: https://www.sidekickportal.com/chat-debug.html

4. **Is the EventSource receiving messages?**
   - Check: Browser DevTools → Network → chat-stream → EventStream tab

5. **Are there JavaScript errors in the console?**
   - Check: Browser DevTools → Console

---

## 📝 REPORT BACK FORMAT

After investigation, report back with:

```
## Investigation Results

### 1. Subsystem Search
- Found in: [file paths]
- Context: [what the code does]

### 2. Content-Script Source
- Source: [browser extension name OR frontend code]
- Purpose: [what it's trying to do]

### 3. Chat Debug Tool Test
- Status: [✅ Working / ❌ Not working]
- Messages received: [Yes/No]
- Error messages: [any errors]

### 4. EventSource Status
- Connection: [OPEN/CLOSED/CONNECTING]
- Messages received: [count]
- Errors: [any errors]

### 5. Proposed Fix
- Root cause: [description]
- Solution: [code changes needed]
- Files to modify: [list]
```

---

## 🛠️ TOOLS AVAILABLE

**Diagnostic Pages** (already created):
- https://www.sidekickportal.com/chat-debug.html
- https://www.sidekickportal.com/firefox-sse-test.html

**Backend Logs** (on ORACLE):
```bash
ssh root@192.168.50.77
pm2 logs chat-backend --lines 50
```

**Vercel Deployment**:
```bash
cd /tank/webhosting/sites/ai-marketplace/frontend
vercel --prod
```

---

## ⚠️ CRITICAL NOTES

1. **DO NOT** modify backend code - it's confirmed working
2. **DO** focus on frontend React components and hooks
3. **DO** check for browser extension interference
4. **DO** test with the diagnostic tools
5. **DO** deploy to Vercel after making changes

---

**START HERE**: Run the grep commands to find "subsystem" in the codebase.
