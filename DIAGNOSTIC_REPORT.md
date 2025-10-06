# AI Marketplace Diagnostic Report
**Date**: 2025-10-06  
**Issues**: Styling Architecture & Notes Not Saving

---

## ISSUE 1: STYLING ARCHITECTURE ANALYSIS

### Current Design System
**Finding**: The project uses **shadcn/ui-style theming** (NOT actual shadcn/ui components)

**Evidence**:
1. ✅ Tailwind CSS with custom theme configuration
2. ✅ CSS variables for semantic colors (`--foreground`, `--background`, etc.)
3. ✅ `tailwindcss-animate` plugin installed
4. ✅ Dark mode via `class` strategy
5. ❌ NO shadcn/ui components installed (only 1 custom glass component)
6. ❌ NO @radix-ui dependencies

### Root Cause of Color Issues

**Problem**: CSS variable inheritance chain is broken

```
Tailwind Config → CSS Variables → Semantic Classes → Components
     ✅              ✅              ❌ BROKEN         ❌ BROKEN
```

**Why `!important` was needed**:
- `text-foreground` class resolves to `hsl(var(--foreground))`
- CSS variables defined in `:root` and `.dark`
- BUT: Modal overlays and TipTap editor create new stacking contexts
- Result: CSS variables don't inherit properly into nested contexts

### Proper Fix Strategy

**Option A: Use Direct Color Classes** (Recommended)
```tsx
// Instead of: text-foreground
// Use: text-gray-900 dark:text-gray-100
```

**Option B: Fix CSS Variable Scope**
```css
/* Ensure variables inherit into all contexts */
*, *::before, *::after {
  --foreground: inherit;
  --background: inherit;
}
```

**Option C: Install Actual shadcn/ui**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add input
```

---

## ISSUE 2: NOTES NOT SAVING - ROOT CAUSE ANALYSIS

### The Real Problem

**Notes ARE saving successfully to backend!**

**Evidence from logs**:
```
POST /api/notes 201 151.363 ms - 240
POST /api/notes 201 136.258 ms - 252
```

**BUT notes don't appear in list because**:
1. Frontend calls wrong domain (www.sidekickportal.com instead of fabric.sidekickportal.com)
2. `loadMyNotes()` gets 404 response
3. Notes list stays empty even though notes exist in database

### Frontend Issues

#### 1. **TipTap Duplicate Link Extension**
**Error**: `[tiptap warn]: Duplicate extension names found: ['link']`

**Root Cause**:
```typescript
// RichTextEditor.tsx line 48
extensions: [
  StarterKit.configure({ ... }), // ← Includes Link extension
  Link.configure({ ... }),        // ← Duplicate!
]
```

**Fix**: StarterKit already includes Link. Remove duplicate.

#### 2. **API Endpoint 404 Error**
**Error**: `GET https://www.sidekickportal.com/api/notes/user/... 404`

**Root Cause**: `NEXT_PUBLIC_ORION_API_URL` not set in Vercel

**Current Flow**:
```
Frontend → www.sidekickportal.com/api/notes → 404 (Vercel has no API routes)
```

**Expected Flow**:
```
Frontend → fabric.sidekickportal.com/api/notes → Backend (port 4001)
```

### Backend Issues

#### 3. **UUID Parsing Error**
**Error**: `code: '22P02', routine: 'string_to_uuid'`

**Root Cause**: Backend receiving malformed UUID in search endpoint

**Fix Needed**: Validate UUID format before database query

---

## COMPREHENSIVE FIX PLAN

### Phase 1: Fix API Routing (CRITICAL - Fixes notes not appearing)

**Step 1**: Set Vercel Environment Variable
```
Variable: NEXT_PUBLIC_ORION_API_URL
Value: https://fabric.sidekickportal.com
Environment: Production
```

**Step 2**: Update default in env.ts
```typescript
// frontend/apps/web/src/lib/env.ts
export const FABRIC_BASE_URL = 
  process.env.NEXT_PUBLIC_ORION_API_URL || 
  'https://fabric.sidekickportal.com'; // ← Change from localhost:8089
```

### Phase 2: Fix TipTap Configuration (Fixes console warnings)

**Remove duplicate Link extension**:
```typescript
// frontend/apps/web/src/components/notes/RichTextEditor.tsx
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      // Link is already included in StarterKit
    }),
    Placeholder.configure({ placeholder }),
    // REMOVE: Link.configure({ ... })
  ],
  // ...
});
```

### Phase 3: Fix Styling Architecture (Proper solution)

**Remove !important overrides and use direct Tailwind classes**:

```typescript
// Modal container
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">

// Labels
<label className="block text-sm font-medium text-gray-900 dark:text-gray-100">

// Inputs
<input className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                  border-gray-300 dark:border-gray-600" />

// TipTap editor - use prose plugin properly
<EditorContent 
  editor={editor} 
  className="prose prose-gray dark:prose-invert max-w-none" 
/>
```

**Update globals.css** - Remove !important, use proper prose styling:
```css
/* TipTap prose styling - no !important needed */
.prose {
  color: rgb(17 24 39); /* gray-900 */
}

.dark .prose {
  color: rgb(243 244 246); /* gray-100 */
}

/* Prose elements inherit from parent */
.prose p,
.prose h1,
.prose h2,
.prose h3,
.prose li {
  color: inherit;
}
```

### Phase 4: Fix Backend UUID Validation (Prevents errors)

```javascript
// backend/ai-service/routes/notes-api.js
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

router.get('/search', async (req, res) => {
  const { q, k = 10, semantic = 'true' } = req.query;
  
  // Validate UUID if searching by ID
  if (q && q.match(/^[0-9a-f]{8}-/)) {
    if (!isValidUUID(q)) {
      return res.status(400).json({ error: 'Invalid UUID format' });
    }
  }
  // ... rest of search logic
});
```

---

## TESTING CHECKLIST

### Phase 1 Test (API Routing)
- [ ] Set NEXT_PUBLIC_ORION_API_URL in Vercel dashboard
- [ ] Redeploy frontend
- [ ] Open browser DevTools Network tab
- [ ] Create a note
- [ ] Verify request goes to fabric.sidekickportal.com
- [ ] Check response is 201 Created
- [ ] Verify note appears in "My Notes" list

### Phase 2 Test (TipTap)
- [ ] Remove duplicate Link extension
- [ ] Build frontend (npm run build)
- [ ] Verify no console warnings
- [ ] Test link insertion button
- [ ] Test all formatting buttons

### Phase 3 Test (Styling)
- [ ] Remove !important from globals.css
- [ ] Use direct Tailwind classes in components
- [ ] Test in light mode - all text readable
- [ ] Test in dark mode - all text readable
- [ ] Test modal dialogs
- [ ] Test TipTap editor content

### Phase 4 Test (Backend)
- [ ] Add UUID validation
- [ ] Test search with valid UUID
- [ ] Test search with invalid UUID (should return 400)
- [ ] Check backend logs for errors

---

## PRIORITY ORDER

1. **CRITICAL**: Set Vercel environment variable → Fixes notes not appearing
2. **HIGH**: Remove TipTap duplicate extension → Fixes console warnings
3. **MEDIUM**: Replace !important with proper Tailwind → Fixes architecture
4. **LOW**: Add UUID validation → Prevents edge case errors

---

## ESTIMATED TIME

- Phase 1 (API Routing): 5 minutes (manual Vercel config)
- Phase 2 (TipTap Fix): 5 minutes
- Phase 3 (Styling Refactor): 30 minutes
- Phase 4 (Backend Validation): 10 minutes

**Total**: ~50 minutes

---

## NEXT STEPS

1. User must set Vercel environment variable (cannot be done via MCP)
2. Agent will implement Phases 2-4 systematically
3. Test each phase before moving to next
4. Document results in MCP memory
