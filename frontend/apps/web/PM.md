# ORION Personal Portal (Frontend) — Product & Engineering Plan (MVP)

Status: **ORION-CORE Integration Analysis Complete** (Phase 1.5). Timebox: ~2 weeks.
Scope: Next.js App Router (Vercel) mobile-first portal replicating ORION-CORE frontend functionality (http://192.168.50.79:3002/) via Cloudflare tunnel.

## 0) ORION-CORE Frontend Analysis & Mobile Integration Status

### **Current Progress: ORION-CORE Analysis Complete**
- **ORION-CORE Frontend Discovered**: Full Next.js application at `http://192.168.50.79:3002/`
- **Sophisticated Architecture**: Glass panel "nebula" design system with dual chat systems
- **Advanced AI Integration**: Gemini 2.5 Flash + 245 RAG memories across 20 categories
- **Mobile Recreation Target**: Feature parity with desktop ORION-CORE in mobile-first design

### **Key Findings from ORION-CORE Frontend**
```yaml
Chat Systems (2 implementations):
  Enhanced Chat (/enhanced-chat):
    - "Claude-like AI" with provider switching (DeepSeek/Gemini)
    - 50+ MCP tools integration
    - Metadata tracking (Memory, Tokens, Confidence, Messages)
    - History management and session control

  Intelligent Chat (/intelligent-chat): [PRIMARY TARGET]
    - Gemini 2.5 Flash as primary AI provider
    - 245 ORION-CORE memories across 20 categories
    - Sophisticated reasoning with conversation memory
    - Tool integration and source attribution
    - Real-time RAG with context synthesis

Design System:
  - Glass Components: glass-nav, glass-card, glass-button, glass-input
  - Nebula Colors: gradient text, status indicators, transparency layers
  - Advanced Backgrounds: radial gradients, ellipse patterns
  - Mobile Adaptations: touch targets, performance optimizations

System Features:
  - Real-time node monitoring (ORION-MEM, ORION-ORACLE, ORION-PC, ORIONLPC, LEVIATHAN)
  - Fabric AI pattern integration (8+ patterns for post-processing)
  - Advanced analytics and performance monitoring
  - Agent orchestration and file management
```

### **Mobile Integration Requirements (Updated)**
```yaml
Priority 1 - Core Chat Functionality:
  - Replicate Intelligent Chat with Gemini 2.5 Flash
  - RAG integration with 245 memories across 20 categories
  - Glass panel UI optimized for mobile touch interactions
  - Provider switching (Gemini primary, DeepSeek secondary)
  - Conversation memory and session management

Priority 2 - System Integration:
  - Real-time system status monitoring
  - Fabric AI pattern integration for response enhancement
  - Mobile-optimized glass component system
  - Touch gestures and haptic feedback

Priority 3 - Advanced Features:
  - Voice input and offline capabilities
  - Push notifications for system alerts
  - Advanced analytics dashboard
  - Agent orchestration interface
```

### **Updated Timeline**
```yaml
Week 1: Backend API Development
  - Intelligent Chat endpoints (/api/intelligent-chat)
  - RAG system integration (245 memories, 20 categories)
  - System status APIs (/api/nodes/status)
  - Gemini 2.5 Flash integration

Week 2: Mobile UI Implementation
  - Glass component system (mobile-optimized)
  - Intelligent Chat interface
  - System status dashboard
  - Provider switching and session management

Week 3: Integration & Testing
  - End-to-end chat functionality
  - RAG system validation
  - Mobile performance optimization
  - Cross-device testing

Week 4: Polish & Deployment
  - Advanced features (voice, offline, notifications)
  - Production deployment and monitoring
  - Documentation and handoff
```

## 1) Goals, KPIs, and Non‑Functional Targets
- Primary goals: mobile-first Assistant + Notes, with Calendar Quick Add and Expenses stub; Google OAuth already live
- KPIs
  - TTI p50 < 2.5s on mid-range mobile; Lighthouse PWA score > 90
  - Chat p50 < 1.5s, first token < 300–500ms end-to-end
  - API success > 99%; zero console errors in production

## 2) System Architecture (Frontend view)
- Next.js 14 App Router on Vercel; Tailwind + shadcn/ui; React Query + Zustand; SSE for streaming
- Cloudflare Tunnel → ORION-CORE services
- PWA: app shell caching now; Workbox + background sync later

## 3) Backend API Surface (ORION-CORE Integration Requirements)

### **Required APIs for ORION-CORE Feature Parity**
Base URL: NEXT_PUBLIC_ORION_API_URL (single gateway)

#### **Priority 1: Intelligent Chat System**
```typescript
// Primary chat endpoint (replicates ORION-CORE Intelligent Chat)
POST /api/intelligent-chat → {
  body: {
    message: string,
    sessionId: string,
    includeRAG: boolean,
    provider: "gemini" | "deepseek",
    ragCategories?: string[] // from 20 available categories
  },
  response: {
    response: string,
    sources: Array<{
      id: string,
      content: string,
      category: string,
      relevance: number,
      source: string
    }>,
    metadata: {
      tokens: number,
      confidence: number,
      processingTime: number,
      ragMemoriesUsed: number,
      provider: string
    },
    sessionInfo: {
      messageCount: number,
      conversationMemory: boolean
    }
  }
}

// RAG Memory System (245 memories across 20 categories)
POST /api/rag/search → {
  body: { query: string, limit: number, categories?: string[] },
  response: {
    results: Array<{
      id: string,
      content: string,
      category: string,
      relevance: number,
      metadata: object
    }>,
    totalMemories: 245,
    categoriesAvailable: 20,
    searchMetadata: {
      queryTime: number,
      resultsFound: number
    }
  }
}

// RAG Categories (20 categories from ORION-CORE)
GET /api/rag/categories → {
  response: {
    categories: Array<{
      name: string,
      count: number,
      description: string,
      examples: string[]
    }>,
    totalCategories: 20,
    totalMemories: 245
  }
}
```

#### **Priority 2: System Status & Monitoring**
```typescript
// Node Status (ORION-CORE nodes: ORION-MEM, ORION-ORACLE, ORION-PC, ORIONLPC, LEVIATHAN)
GET /api/nodes/status → {
  response: {
    nodes: Array<{
      name: "ORION-MEM" | "ORION-ORACLE" | "ORION-PC" | "ORIONLPC" | "LEVIATHAN",
      status: "online" | "warning" | "error",
      uptime: number,
      services: Array<{
        name: string,
        port: number,
        status: string,
        latency?: number
      }>,
      hardware?: {
        cpu: string,
        memory: string,
        gpu?: string
      }
    }>,
    systemHealth: "healthy" | "degraded" | "critical",
    totalNodes: 5,
    activeNodes: number
  }
}

// Real-time Metrics (matches ORION-CORE dashboard)
GET /api/realtime/metrics → {
  response: {
    activeNodes: number,
    runningServices: number,
    totalUptime: number,
    systemLoad: {
      cpu: number,
      memory: number,
      network: number
    },
    aiMetrics: {
      ragMemories: 245,
      fabricPatterns: number,
      activeChats: number
    }
  }
}
```

#### **Priority 3: AI Provider Integration**
```typescript
// Provider Management (Gemini 2.5 Flash primary, DeepSeek secondary)
GET /api/ai/providers → {
  response: {
    providers: Array<{
      name: "gemini" | "deepseek" | "local",
      status: "available" | "unavailable" | "limited",
      model: string,
      capabilities: string[],
      latency?: number
    }>,
    primary: "gemini",
    fallback: "deepseek"
  }
}

// Session Management (conversation memory)
POST /api/chat/session → {
  body: { action: "create" | "retrieve" | "clear", sessionId?: string },
  response: {
    sessionId: string,
    messageCount: number,
    conversationMemory: boolean,
    createdAt: string,
    lastActivity: string
  }
}
```

Open confirmations required: Gemini 2.5 Flash API integration; RAG memory export from ORION-CORE; session persistence strategy.

## 3a) Backend Integration Requirements Analysis (from ORION-CORE)
- Current services (prod-ready):
  - Vector/Memory (:8081) store/search/batch (17K vectors, Qdrant)
  - Fabric Bridge (:8089) AI pattern execution (40+ patterns)
  - Embedding Service (:8091) vector generation with fallbacks
  - Gate API (:8085) additional services
  - Health monitoring via MCP server
- Required backend modifications (prioritized):
  1) SSE Chat Streaming (Priority 1)
     - Implement on Fabric Bridge as GET /api/chat-streaming (SSE)
     - Event format: `data: <token>\n\n`; end signal: `data: [DONE]`\n\n
     - Auth: Authorization: Bearer <JWT> (HS256; short-lived)
  2) System Status (Priority 1)
     - GET /api/system-status → { status: "healthy|degraded|down", services: {...}, uptime }
     - Cache 15–30s to reduce load
  3) CORS & Security (Priority 1)
     - Allow origins: https://www.sidekickportal.com and https://*.vercel.app
     - Allow headers: Authorization, Content-Type, X-Request-Id; no credentials
     - JWT validation (iss/aud/exp) with shared secret
  4) OCR Stub (Priority 2)
     - POST /api/ocr/receipt (multipart/form-data file)
     - Response: { description, amount, date, merchant? }
  5) Mobile-Optimized Vector Search (Priority 2)
     - topK default 8, max 25; snippet ≤ 120 chars; gzip responses; payload < 500KB; pagination for >topK
  6) Batch Notes Operations (Priority 3)
     - REST wrapper over existing MCP batch store

## 3b) Backend Contracts (proposed)
- Authentication (frontend → ORION):
  - Bearer JWT (HS256) using ORION_SHARED_JWT_SECRET; claims: iss=https://www.sidekickportal.com, aud=orion-core, sub=<user-email>, exp≈5m, iat
- SSE Chat Streaming:
  - GET {BASE}/api/chat-streaming?q=<prompt>
  - Headers: Accept: text/event-stream; Authorization: Bearer <JWT>
  - Events: token chunks via `data: ...`; terminate with `data: [DONE]` (server timeout ~120s)
  - Optional (later): POST /api/chat → {conversationId}, then GET /api/chat-streaming?conversationId=...
- System Status:
  - GET {BASE}/api/system-status → { status, uptime, services: [{ name, ok, latency_ms }] }
  - Cache-Control: public, max-age=15, stale-while-revalidate=30
- OCR (stub):
  - POST {BASE}/api/ocr/receipt (multipart/form-data: field "file"), limit 5 MB
  - Response: { description: string, amount: number, date: string, merchant?: string }
- Vector Search (mobile):
  - POST {BASE}/api/vector/search { q, topK?, filter? } → { results: [{ id, score, snippet?, metadata? }] }
  - Enforce gzip; clamp topK ≤ 25; payload budget < 500KB; support pagination token
- Rate Limits (per user, suggested):
  - chat-streaming: 10 streams/min; max 1 concurrent
  - vector/search: 30 req/min; fabric/execute: 20 req/min
  - system-status: 4 req/min; ocr/receipt: 5 req/min; 50 MB/day cap
  - Return 429 + Retry-After; structured JSON error body
- CORS:
  - Access-Control-Allow-Origin: https://www.sidekickportal.com, https://*.vercel.app
  - Access-Control-Allow-Methods: GET, POST, OPTIONS; Headers: Authorization, Content-Type, X-Request-Id; Credentials: false
- Environment variables (coordination):
  - Backend: ORION_SHARED_JWT_SECRET, CORS_ALLOW_ORIGINS
  - Frontend: NEXT_PUBLIC_ORION_API_URL, NEXT_PUBLIC_CHAT_STREAM_URL, NEXT_PUBLIC_STATUS_URL, ORION_SHARED_JWT_ISS, ORION_SHARED_JWT_AUD
- Testing matrix (backend):
  - SSE smoke (GET with Bearer); 401/403 for bad JWT; CORS OPTIONS ok; status cache; OCR size limits; vector gzip & payload caps
- Pending backend confirmations:
  - Final tunnel domain(s) for CORS/CSP
  - SSE GET vs POST pre-step: adopting GET now; confirm if POST+id is needed later
  - OCR path/limits acceptance; vector search topK and pagination tokens
  - JWT claim values (iss/aud) and allowlist policy


## 3c) Backend Phase 1 — Completion Summary
- Status: COMPLETE and validated against specs
- Endpoints live (JWT-protected):
  - GET /api/chat-streaming (SSE, heartbeats, 120s timeout, [DONE] terminator)
  - GET /api/system-status (15s cache; per-service latencies)
  - POST /api/ocr/receipt (5MB limit; realistic stub)
- Security & limits:
  - HS256 JWT (iss/aud/exp/sub) validation; env-driven CORS; token-bucket rate limits
  - Structured errors incl. 429 with Retry-After
- Deliverables provided: middlewares, handlers, test_endpoints.sh, integration README

## 3d) Frontend Integration Checklist (post‑backend completion)
- Env & secrets
  - [ ] Confirm Cloudflare tunnel domain(s) → NEXT_PUBLIC_ORION_API_URL, NEXT_PUBLIC_CHAT_STREAM_URL, NEXT_PUBLIC_STATUS_URL
  - [ ] Share ORION_SHARED_JWT_SECRET via secure channel; set in Vercel (server-only)
- Auth & headers
  - [ ] Server route to mint short‑lived JWT (HS256; exp≈5m; iss/aud/sub)
  - [ ] All ORION calls carry Authorization: Bearer <JWT>
- Assistant (SSE)
  - [ ] useChatStream hook wiring to /api/chat-streaming, buffered UI updates, retries
  - [ ] Optional proxy route if Authorization header on EventSource is required
- Status & OCR
  - [ ] SystemStatusChip polling /api/system-status (staleTime 15s)
  - [ ] OCR upload (FormData) with client file-size guard; handle 413/429
- Perf & PWA
  - [ ] Dynamic imports for heavy UI; service worker shell caching; bypass SSE


## 3e) Backend Configuration Confirmations (Final)
- Ingress: fabric.sidekickportal.com → http://localhost:8089 (Fabric Bridge host)
- Auth: HS256; sub=email; 30s clock skew tolerated; no kid required; Authorization header only (no token in query)
- CORS: https://www.sidekickportal.com, https://*.vercel.app, https://fabric.sidekickportal.com
- Correlation: X-Request-Id header propagated end-to-end
- Limits: chat prompt ≤ 8KB; stream ≤ 120s; 1 concurrent/user; vector topK default=8 max=25; payload ≤ 500KB gzip; query ≤ 2KB
- Endpoints on Fabric Bridge host:
  - GET /api/chat-streaming, GET /api/system-status, POST /api/ocr/receipt, GET /health, GET /fabric_patterns
- Frontend envs (prod):
  - NEXT_PUBLIC_ORION_API_URL=https://fabric.sidekickportal.com
  - NEXT_PUBLIC_CHAT_STREAM_URL=https://fabric.sidekickportal.com/api/chat-streaming
  - NEXT_PUBLIC_STATUS_URL=https://fabric.sidekickportal.com/api/system-status
  - NEXT_PUBLIC_OCR_URL=https://fabric.sidekickportal.com/api/ocr/receipt
  - ORION_SHARED_JWT_SECRET=server-only (Vercel)

## 3f) Agent Operating Model (MCP Loop)
- Source of truth: this PM.md. Agents must always plan from the active sections here, and update this doc after each meaningful step.
- Continuous loop (no idling): Plan → Execute smallest viable step → Validate (health, type/build/tests) → Report via MCP → Update PM.md → Completion Query → Replan.
- Cadence: Event-driven snapshots on deploy/config/milestone/incident; optional daily summary at 18:00 local. No per‑minute snapshots.

MCP communication
- Message types: [backend-status], [project-snapshot], [alert]
- Required fields: timestamp, status=OK|WARN|ERROR, endpoints_tested[], latencies_ms{}, errors[], correlation_ids[]
- Headers for runtime checks: Authorization: Bearer <jwt>, X-Request-Id: <uuid>

Completion queries (post‑update)
- What remains to meet §14 Acceptance for this feature?
- Are any limits/CORS/claims failing this step?
- Is UX quality acceptable per §1 KPIs?
- What is the next smallest step to move the status bar?

Quality gates (must pass before moving on)
- Build/type-check green; no console errors
- API contracts honored; limits enforced (prompt ≤ 8KB, topK ≤ 25, file ≤ 5MB, query ≤ 2KB)
- SSE terminates with [DONE]; Authorization header only; X‑Request‑Id propagated end‑to‑end
- CORS/ingress validated for fabric.sidekickportal.com

Autonomy guardrails
- No package installs or deployments without explicit approval
- Safe validations allowed automatically (tests/linters/builds)
- After each step: update PM.md (this section if needed) and post an MCP status

Notes/Calendar status
- Integration is parked pending provider decision (self‑hosted preferred). Keep UI placeholders; do not wire external providers until confirmed.

Operational pointers
- Backend Agent: Fabric Bridge, CORS/ingress, OCR, future Notes/Calendar endpoints (self‑hosted)
- Frontend Agent: Next.js UI, proxy routes, env wiring, UX flags; keep Notes/Calendar feature‑flagged until backends are live
- Orchestrator: Enforces this loop, quality gates, and MCP protocols

## 3g) Frontend Integration Phase — Kickoff (Production Host)
- Preconditions (met): Fabric Bridge deployed; ingress configured; JWT+CORS+limits enforced.
- Actions (next smallest steps):
  - [ ] Set frontend envs to production host (see §3e)
  - [ ] Run prod-host e2e smoke: status (JWT 200), SSE stream [DONE], OCR ≤5MB/413>5MB
  - [ ] Post [project-snapshot] with latencies and results via MCP
  - [ ] Update PM.md checklists and Change Log; add completion query
- Notes/Calendar: await MCP posts [backend-status] ready:notes_v1 | ready:calendar_v1 with contracts; then wire adapters.



## 4) Key Decisions (locked for Phase 1)
- UI library: shadcn/ui (copy-in components) for speed + accessibility
- Real-time: SSE via EventSource for chat streaming
- State: React Query (server), Zustand (ephemeral UI)
- Notes editor: markdown textarea + preview; enrich via Fabric
- PWA: basic SW shell caching now; background sync in Phase 2
- Charts: dynamic import (Recharts) only when needed
- Calendar Google sync: Phase 2

## 5) Information Architecture and Component Layout
- Assistant (/assistant)
  - ChatScreen (orchestrator), MessageList (virtualized when large), Composer (Textarea + Send), SystemStatusChip, optional ToolActions (/note, /event, /expense)
- Notes (/notes)
  - NotesScreen (SearchBar + NotesList + NewNote), NoteEditorSheet (markdown; Enrich)
- Calendar (/calendar)
  - CalendarScreen (Agenda for MVP), AddEventSheet (intent extraction via Fabric)
- Expenses (/expenses)
  - ExpensesScreen (UploadReceipt + list), AnalyticsCharts (dynamic import), OCR stub for MVP

## 6) State Management Strategy
- React Query
  - Defaults: staleTime 60s (status 15s), cacheTime 5m, retries: 1
  - Invalidations on create/update
- Zustand
  - drawer/sheet visibility; composer text; filters and selections
- Streaming buffer
  - Append tokens to local buffer; flush UI every 50–100ms; commit final message to query cache

## 7) Streaming (SSE) Interaction Model
- Preferred: Open EventSource to /chat-streaming with either:
  - Query param: ?q=<prompt> (simple), or
  - Conversation id: prior POST returns id; then GET stream with id

### 12a) Ingress Remediation Checklist (Blocking)
- [x] Cloudflare tunnel maps fabric.sidekickportal.com → http://localhost:8089 (Fabric Bridge)
- [x] cloudflared tunnel ingress validate passes
- [x] Tunnel restarted and DNS resolving (production host active; propagation in progress)
- [x] Health: GET https://fabric.sidekickportal.com/health → 200 (also confirmed locally at http://localhost:8089/health)
- [x] Status: GET https://fabric.sidekickportal.com/api/system-status → 200 with JWT (401 without token) and includes per-service latencies
- [x] SSE: GET https://fabric.sidekickportal.com/api/chat-streaming streams and terminates with [DONE] (JWT required)
- [x] OCR: POST https://fabric.sidekickportal.com/api/ocr/receipt (≤5MB → 200; >5MB → 413)
- [x] MCP: [alert] status-degraded cleared after successful validation

Note: Tasks are not complete until this PM.md reflects updated state and acceptance; after each action, post [backend-status] via MCP and add a completion query.

- Reconnect: exponential backoff (1s, 2s, 4s; 3 attempts); close on unmount/route change
- SW bypass: ensure SSE requests are not intercepted by Service Worker

## 8) Performance and Code Splitting
- Budgets: initial JS p75 < 180–220KB gz on first route; images optimized via next/image; avoid blocking fonts
- Dynamic import (ssr: false) for heavy components: markdown editor, charts, non-critical sheets
- Debounce search input; infinite scroll for lists; request timeouts (15s)
- Preconnect to ORION base and chat streaming host

## 9) PWA and Offline Strategy (Phase 1)
- App shell + static asset caching (stale-while-revalidate)
- Cache small JSON GETs with short TTL; network-first for status and semantic search
- Offline behavior: read-only landing and last notes list; chat requires network
- Phase 2: Workbox + background sync queues for POSTs (notes/expenses)

## 10) Security and Privacy
- NextAuth for auth; HTTP-only cookies; no tokens in localStorage
- CSP: connect-src Vercel + tunnel domain; script-src 'self' with nonce; no third-party trackers
- Sanitize markdown on render (DOMPurify)

## 11) Observability & SLOs
- SystemStatusChip polling /system-status every 15s; simple latency indicator
- Web Vitals beacon to first-party endpoint; structured logs with requestId in client wrapper
- SLOs: chat first-token < 500ms; TTI < 2.5s p50; error rate < 1%

## 12) Backend Coordination (tunnel discovered; finalize ingress and claims)
1) Ingress mapping for Fabric Bridge (8089): please add hostname → http://localhost:8089. Proposed: fabric.sidekickportal.com
   - Endpoints on this host: GET /api/chat-streaming, GET /api/system-status, POST /api/ocr/receipt
   - I found existing hostnames via cloudflared: sidekickportal.com, api.sidekickportal.com→8081, ws.sidekickportal.com→3002, orion-vector.sidekickportal.com→8081
2) JWT claims: confirm sub format (email preferred) and any clock skew, extra claims (e.g., kid) requirements
3) SSE auth fallback: do you allow token=<jwt> as query param? (We implemented a proxy that attaches Authorization header.)
4) Request correlation: confirm preferred header name (e.g., X-Request-Id) for logs; I will propagate it client→proxy→backend
5) Prompt and payload limits: max prompt bytes for /api/chat-streaming; confirm vector payload/topK caps for client enforcement
6) OCR base: confirm it is served on Fabric Bridge host alongside /api/chat-streaming (per spec). If different, share exact base URL

## 13) Questions for Advisor Agent (UX/Architecture)
1) Notes: semantic vs keyword default? Proposed: keyword default with a “Semantic” toggle
2) Assistant: include inline tool result cards (tables/charts) or open as sheets? MVP: inline concise cards
3) Calendar: prioritize Agenda view for MVP; full grid view later — confirm
4) PWA: install prompt timing and offline expectations; confirm minimal offline (read-only) for MVP
5) Security posture: additional client-side constraints (clipboard, iframes, external embeds) to include in CSP?

## 14) Acceptance Criteria (Phase 1)
- Assistant: streaming tokens; retries; average first-token < 500ms; send/stop controls; copy last reply
- Notes: create/edit; Enrich returns title+tags; semantic search works with topK; list pagination/infinite scroll
- Calendar: add event via text extraction; items render in Agenda; local persistence acceptable for MVP
- Expenses: upload → mocked OCR → parsed fields shown; list with filters; basic month summary
- PWA: installable; offline app shell; last notes list available offline
- Performance: Lighthouse PWA ≥ 90 (mobile); TTI p50 < 2.5s; initial JS within budget
- Stability: no unhandled promise rejections; SSE stable with brief network loss

## 15) Risks & Mitigations
- Tunnel misconfig → early e2e tests; clear errors; bypass SW for SSE
- Large vector payloads → limit topK; truncate snippets; gzip responses
- Bundle creep → bundle analyzer; dynamic() heavy parts; avoid large UI libs
- Offline edge cases → minimal SW policies; Phase 2 background sync
- Mobile UX regressions → real-device tests; 48px targets; virtual keyboard safe areas

## 16) Delivery Plan (1‑week MVP)
Day 1
- Initialize UI components (shadcn/ui), set up React Query provider, Zustand store
- orionClient wrappers; env wiring (NEXT_PUBLIC_ORION_API_URL, CHAT_STREAM URL)

Day 2–3
- Assistant streaming UI + useChatStream (buffering, retries); SystemStatusChip
- Notes: list/search (keyword + semantic toggle); NoteEditorSheet + Enrich

Day 4–5
- Calendar: Quick Add (event_extract) + Agenda list (local persistence)
- Expenses: upload → OCR stub → list; dynamic charts scaffold
- Service Worker: shell caching; bypass SSE

- v0.3 (backend phase 1 complete): documented completion summary (§3c) and frontend integration checklist (§3d); ready to implement frontend wiring pending tunnel domain + JWT secret.

Day 6
- Bundle optimization; dynamic imports; 4G mobile tests; Web Vitals beacon

Day 7
- Bugfix, polish, accessibility pass; Lighthouse audit ≥ 90; deploy

## 17) Project Task List (Phase 1)
- Foundation
  - [ ] Set up shadcn/ui baseline and theme tokens
  - [ ] React Query + Zustand providers and patterns
  - [ ] orionClient with timeouts and error normalization
- Assistant
  - [ ] useChatStream (SSE) with buffering/retries
  - [ ] ChatScreen, MessageList, Composer; SystemStatusChip
- Notes
  - [ ] NotesScreen (search + list + new)
  - [ ] NoteEditorSheet (markdown + Enrich)
  - [ ] Vector store/search integration
- Calendar
  - [ ] Quick Add (event_extract) → Agenda list (local storage/API as available)
- Expenses
  - [ ] Upload + OCR stub integration; list; basic charts (dynamic)
- PWA & Perf
  - [ ] Service worker for shell caching; bypass SSE
  - [ ] Dynamic imports; bundle analyzer; preconnects
- QA & Observability
  - [ ] Web Vitals beacon; status polling; error boundaries; e2e smoke

## 18) Change Log

- **v0.4 (ORION-CORE Integration Analysis)**: Discovered full ORION-CORE frontend at http://192.168.50.79:3002/ with sophisticated glass panel UI, dual chat systems (Enhanced Chat + Intelligent Chat), Gemini 2.5 Flash integration, and 245 RAG memories across 20 categories. Updated PM with mobile recreation requirements, new API specifications for intelligent chat system, RAG integration, and system monitoring. Timeline extended to 2-3 weeks for feature parity implementation. Next: comprehensive backend team prompt and mobile UI development.

- v0.3.1 (incident): Production DNS/ingress degraded — fabric.sidekickportal.com does not resolve externally. Frontend proxy functions deployed and invoked from Vercel, but upstream returns 404/upstream_error due to unreachable Fabric Bridge. Action: restore Cloudflare tunnel ingress mapping (fabric.sidekickportal.com → http://localhost:8089), validate, restart tunnel, then re‑run prod smokes. Pending: confirm Vercel envs present (ORION_SHARED_JWT_SECRET, ORION_SHARED_JWT_ISS, ORION_SHARED_JWT_AUD, NEXT_PUBLIC_ORION_API_URL) and redeploy.

- v0.3 (ingress + validation): Cloudflare ingress configured for fabric.sidekickportal.com → 8089; Fabric Bridge deployed; MCP remediation + revalidation complete; endpoints healthy (JWT required for status/stream); OCR 5MB limit and prompt ≤8KB enforced; degraded alert cleared. Next: set frontend envs to production host and wire Notes/Calendar when backends are live.

- v0.2 (backend contracts): added Backend Integration Requirements Analysis (§3a) and Backend Contracts (§3b); aligned SSE spec (GET /api/chat-streaming), CORS, JWT auth, OCR stub, vector limits, rate limits; awaiting backend confirmations (tunnel domain, JWT claims, optional POST pre-step).

- v0.1 (planning): decisions locked; task list created; awaiting backend/advisor confirmations (see §12–13)

