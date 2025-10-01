# Temporal Query Implementation Plan

**Date:** October 1, 2025  
**Priority:** HIGH  
**Complexity:** MEDIUM  
**Estimated Time:** 2-3 weeks

---

## Overview

This document provides a detailed implementation plan for adding temporal query capabilities to the ORION-CORE chat system, enabling users to ask questions like "What did we do yesterday?" and receive accurate, date-filtered conversation history.

---

## Phase 1: Date Filtering in getUserSessions()

### 1.1 Update Session Client Interface

**File:** `frontend/apps/web/src/lib/session/client.ts`

**Changes:**

```typescript
// Add new interface for session filtering options
export interface SessionFilterOptions {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// Update getUserSessions function signature
export async function getUserSessions(
  userId: string,
  options?: SessionFilterOptions
): Promise<ChatSession[]> {
  try {
    const params = new URLSearchParams({ userId });
    
    if (options?.startDate) {
      params.set('startDate', options.startDate.toISOString());
    }
    if (options?.endDate) {
      params.set('endDate', options.endDate.toISOString());
    }
    if (options?.limit) {
      params.set('limit', options.limit.toString());
    }
    if (options?.sortBy) {
      params.set('sortBy', options.sortBy);
    }
    if (options?.sortOrder) {
      params.set('sortOrder', options.sortOrder);
    }
    
    const response = await fetch(`${BACKEND_API_URL}/api/sessions/list?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get sessions: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.sessions || [];
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
}
```

**Testing:**
```typescript
// Test cases
describe('getUserSessions with date filtering', () => {
  it('should fetch sessions from yesterday', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const sessions = await getUserSessions('user123', {
      startDate: startOfDay(yesterday),
      endDate: endOfDay(yesterday)
    });
    
    expect(sessions.length).toBeGreaterThan(0);
    sessions.forEach(s => {
      const createdAt = new Date(s.createdAt);
      expect(createdAt >= startOfDay(yesterday)).toBe(true);
      expect(createdAt <= endOfDay(yesterday)).toBe(true);
    });
  });
});
```

---

## Phase 2: Temporal Query Parser

### 2.1 Create Temporal Parser Module

**File:** `frontend/apps/web/src/lib/temporal/parser.ts` (NEW FILE)

**Dependencies:**
```bash
npm install date-fns
```

**Implementation:**

```typescript
import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  subWeeks,
  startOfMonth,
  endOfMonth,
  subMonths
} from 'date-fns';

export interface TemporalRange {
  startDate: Date;
  endDate: Date;
  description: string;
  confidence: number; // 0-1 scale
}

export interface TemporalKeyword {
  pattern: RegExp;
  handler: (now: Date, match: RegExpMatchArray) => TemporalRange;
}

// Define temporal keyword patterns
const TEMPORAL_KEYWORDS: TemporalKeyword[] = [
  // Yesterday
  {
    pattern: /\b(yesterday|last night)\b/i,
    handler: (now) => {
      const yesterday = subDays(now, 1);
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
        description: "yesterday",
        confidence: 1.0
      };
    }
  },
  
  // Today
  {
    pattern: /\b(today|this morning|this afternoon|this evening)\b/i,
    handler: (now) => ({
      startDate: startOfDay(now),
      endDate: now,
      description: "today",
      confidence: 1.0
    })
  },
  
  // Last week
  {
    pattern: /\blast week\b/i,
    handler: (now) => {
      const lastWeek = subWeeks(now, 1);
      return {
        startDate: startOfWeek(lastWeek, { weekStartsOn: 1 }), // Monday
        endDate: endOfWeek(lastWeek, { weekStartsOn: 1 }),
        description: "last week",
        confidence: 0.9
      };
    }
  },
  
  // This week
  {
    pattern: /\bthis week\b/i,
    handler: (now) => ({
      startDate: startOfWeek(now, { weekStartsOn: 1 }),
      endDate: now,
      description: "this week",
      confidence: 1.0
    })
  },
  
  // Last month
  {
    pattern: /\blast month\b/i,
    handler: (now) => {
      const lastMonth = subMonths(now, 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
        description: "last month",
        confidence: 0.8
      };
    }
  },
  
  // Recently (last 7 days)
  {
    pattern: /\b(recently|lately|past (few )?days?)\b/i,
    handler: (now) => ({
      startDate: subDays(now, 7),
      endDate: now,
      description: "recently (last 7 days)",
      confidence: 0.7
    })
  },
  
  // Last N days
  {
    pattern: /\blast (\d+) days?\b/i,
    handler: (now, match) => {
      const days = parseInt(match[1]);
      return {
        startDate: subDays(now, days),
        endDate: now,
        description: `last ${days} days`,
        confidence: 1.0
      };
    }
  },
  
  // N days ago
  {
    pattern: /\b(\d+) days? ago\b/i,
    handler: (now, match) => {
      const days = parseInt(match[1]);
      const targetDay = subDays(now, days);
      return {
        startDate: startOfDay(targetDay),
        endDate: endOfDay(targetDay),
        description: `${days} days ago`,
        confidence: 1.0
      };
    }
  }
];

/**
 * Parse a query string for temporal references
 * @param query - The user's query string
 * @returns TemporalRange if temporal reference found, null otherwise
 */
export function parseTemporalQuery(query: string): TemporalRange | null {
  const now = new Date();
  const lowerQuery = query.toLowerCase();
  
  // Try each temporal keyword pattern
  for (const keyword of TEMPORAL_KEYWORDS) {
    const match = lowerQuery.match(keyword.pattern);
    if (match) {
      return keyword.handler(now, match);
    }
  }
  
  return null;
}

/**
 * Check if a query contains temporal keywords
 * @param query - The user's query string
 * @returns true if temporal keywords detected
 */
export function hasTemporalKeywords(query: string): boolean {
  return parseTemporalQuery(query) !== null;
}

/**
 * Extract temporal context from query
 * @param query - The user's query string
 * @returns Object with temporal info and cleaned query
 */
export function extractTemporalContext(query: string): {
  temporal: TemporalRange | null;
  cleanedQuery: string;
} {
  const temporal = parseTemporalQuery(query);
  
  if (!temporal) {
    return { temporal: null, cleanedQuery: query };
  }
  
  // Remove temporal keywords from query
  let cleanedQuery = query;
  for (const keyword of TEMPORAL_KEYWORDS) {
    cleanedQuery = cleanedQuery.replace(keyword.pattern, '').trim();
  }
  
  return { temporal, cleanedQuery };
}
```

**Testing:**
```typescript
describe('parseTemporalQuery', () => {
  it('should parse "yesterday" correctly', () => {
    const result = parseTemporalQuery("What did we do yesterday?");
    expect(result).not.toBeNull();
    expect(result?.description).toBe("yesterday");
    expect(result?.confidence).toBe(1.0);
  });
  
  it('should parse "last 3 days" correctly', () => {
    const result = parseTemporalQuery("Show me conversations from last 3 days");
    expect(result).not.toBeNull();
    expect(result?.description).toBe("last 3 days");
  });
  
  it('should return null for non-temporal queries', () => {
    const result = parseTemporalQuery("What is the capital of France?");
    expect(result).toBeNull();
  });
});
```

---

## Phase 3: Backend Date-Based Session Search

### 3.1 Update Backend Session List Endpoint

**File:** `backend/api/sessions/list/route.ts` (MODIFY EXISTING)

**Changes:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSessionsByDateRange } from '@/lib/database/sessions';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const limit = parseInt(searchParams.get('limit') || '50');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  
  try {
    const sessions = await getSessionsByDateRange({
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      sortBy: sortBy as 'createdAt' | 'updatedAt',
      sortOrder: sortOrder as 'asc' | 'desc'
    });
    
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3.2 Update Database Query Function

**File:** `backend/lib/database/sessions.ts` (MODIFY EXISTING)

**Changes:**

```typescript
import { Pool } from 'pg';

interface SessionQueryOptions {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export async function getSessionsByDateRange(options: SessionQueryOptions) {
  const {
    userId,
    startDate,
    endDate,
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    let query = `
      SELECT 
        session_id,
        user_id,
        title,
        first_message,
        last_message,
        message_count,
        created_at,
        updated_at
      FROM sessions
      WHERE user_id = $1
    `;
    
    const params: any[] = [userId];
    let paramIndex = 2;
    
    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    query += ` LIMIT $${paramIndex}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    return result.rows;
  } finally {
    await pool.end();
  }
}
```

### 3.3 Add Database Indexes

**File:** `backend/database/migrations/add_session_indexes.sql` (NEW FILE)

```sql
-- Add indexes for temporal queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_created 
ON sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_user_updated 
ON sessions(user_id, updated_at DESC);

-- Add index for combined queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_created_updated 
ON sessions(user_id, created_at DESC, updated_at DESC);

-- Analyze table for query optimization
ANALYZE sessions;
```

**Run Migration:**
```bash
psql -h 192.168.50.79 -U orion_user -d orion_core -f backend/database/migrations/add_session_indexes.sql
```

---

## Phase 4: Prompt Engineering for Temporal Context

### 4.1 Update Chat Component

**File:** `frontend/apps/web/src/components/chat/intelligent-chat.tsx`

**Changes:**

```typescript
import { parseTemporalQuery, extractTemporalContext } from '@/lib/temporal/parser';
import { getUserSessions } from '@/lib/session/client';

// Inside the component, update sendMessage function
const sendMessage = async () => {
  if (!inputValue.trim() || isStreaming || !userEmail) return;

  const messageContent = inputValue.trim();
  
  // Extract temporal context from query
  const { temporal, cleanedQuery } = extractTemporalContext(messageContent);
  let contextPrefix = "";
  let enhancedMessage = messageContent;
  
  if (temporal && temporal.confidence >= 0.7) {
    try {
      // Fetch sessions from date range
      const userId = getUserId();
      const sessions = await getUserSessions(userId, {
        startDate: temporal.startDate,
        endDate: temporal.endDate,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
      if (sessions.length > 0) {
        // Build context from sessions
        const sessionSummaries = sessions.map(s => {
          const date = new Date(s.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          return `- "${s.title || 'Untitled'}" (${s.messageCount} messages, ${date})`;
        }).join('\n');
        
        contextPrefix = `Based on our conversation history from ${temporal.description}, here's what we discussed:\n\n${sessionSummaries}\n\nNow, regarding your question: `;
        enhancedMessage = contextPrefix + cleanedQuery;
      } else {
        contextPrefix = `I don't have any conversation history from ${temporal.description}. `;
        enhancedMessage = contextPrefix + cleanedQuery;
      }
    } catch (error) {
      console.error('Error fetching temporal sessions:', error);
      // Fall back to original message
      enhancedMessage = messageContent;
    }
  }
  
  // Add user message to UI
  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    type: 'user',
    content: messageContent, // Show original message to user
    timestamp: new Date(),
  };
  setMessages(prev => [...prev, userMessage]);
  setInputValue('');
  
  // Save user message to session
  const currentSessionId = getCurrentSessionId();
  if (currentSessionId && userEmail) {
    await saveMessage(currentSessionId, 'user', messageContent, {
      tokens: messageContent.length,
      temporalContext: temporal ? {
        description: temporal.description,
        startDate: temporal.startDate.toISOString(),
        endDate: temporal.endDate.toISOString()
      } : undefined
    });
  }
  
  // Pass last 10 messages as conversation history
  const recentMessages = messages.slice(-10).map(m => ({
    role: m.type,
    content: m.content
  }));
  
  // Start streaming with enhanced message (includes temporal context)
  await startStream(enhancedMessage, { 
    provider: currentProvider,
    conversationHistory: recentMessages
  });
};
```

---

## Phase 5: Testing Strategy

### 5.1 Unit Tests

**File:** `frontend/apps/web/src/lib/temporal/__tests__/parser.test.ts` (NEW FILE)

```typescript
import { parseTemporalQuery, hasTemporalKeywords, extractTemporalContext } from '../parser';
import { startOfDay, endOfDay, subDays } from 'date-fns';

describe('Temporal Parser', () => {
  describe('parseTemporalQuery', () => {
    it('should parse "yesterday" correctly', () => {
      const result = parseTemporalQuery("What did we do yesterday?");
      expect(result).not.toBeNull();
      expect(result?.description).toBe("yesterday");
      expect(result?.confidence).toBe(1.0);
      
      const yesterday = subDays(new Date(), 1);
      expect(result?.startDate.getDate()).toBe(startOfDay(yesterday).getDate());
      expect(result?.endDate.getDate()).toBe(endOfDay(yesterday).getDate());
    });
    
    it('should parse "last 3 days" correctly', () => {
      const result = parseTemporalQuery("Show me conversations from last 3 days");
      expect(result).not.toBeNull();
      expect(result?.description).toBe("last 3 days");
      expect(result?.confidence).toBe(1.0);
    });
    
    it('should parse "this morning" correctly', () => {
      const result = parseTemporalQuery("What did we discuss this morning?");
      expect(result).not.toBeNull();
      expect(result?.description).toBe("today");
      expect(result?.startDate.getHours()).toBe(0);
    });
    
    it('should return null for non-temporal queries', () => {
      const result = parseTemporalQuery("What is the capital of France?");
      expect(result).toBeNull();
    });
  });
  
  describe('hasTemporalKeywords', () => {
    it('should detect temporal keywords', () => {
      expect(hasTemporalKeywords("What did we do yesterday?")).toBe(true);
      expect(hasTemporalKeywords("Show me last week's conversations")).toBe(true);
      expect(hasTemporalKeywords("What is AI?")).toBe(false);
    });
  });
  
  describe('extractTemporalContext', () => {
    it('should extract temporal context and clean query', () => {
      const result = extractTemporalContext("What did we do yesterday?");
      expect(result.temporal).not.toBeNull();
      expect(result.cleanedQuery).toBe("What did we do?");
    });
  });
});
```

### 5.2 Integration Tests

**File:** `frontend/apps/web/src/lib/session/__tests__/client.test.ts` (MODIFY EXISTING)

```typescript
import { getUserSessions } from '../client';
import { startOfDay, endOfDay, subDays } from 'date-fns';

describe('Session Client with Date Filtering', () => {
  it('should fetch sessions from yesterday', async () => {
    const yesterday = subDays(new Date(), 1);
    
    const sessions = await getUserSessions('test-user-123', {
      startDate: startOfDay(yesterday),
      endDate: endOfDay(yesterday),
      limit: 10
    });
    
    expect(Array.isArray(sessions)).toBe(true);
    sessions.forEach(s => {
      const createdAt = new Date(s.createdAt);
      expect(createdAt >= startOfDay(yesterday)).toBe(true);
      expect(createdAt <= endOfDay(yesterday)).toBe(true);
    });
  });
  
  it('should handle no sessions in date range', async () => {
    const farPast = subDays(new Date(), 365);
    
    const sessions = await getUserSessions('test-user-123', {
      startDate: startOfDay(farPast),
      endDate: endOfDay(farPast)
    });
    
    expect(sessions).toEqual([]);
  });
});
```

### 5.3 E2E Tests

**File:** `frontend/apps/web/e2e/temporal-queries.spec.ts` (NEW FILE)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Temporal Query E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://www.sidekickportal.com/assistant');
    // Assume user is logged in
  });
  
  test('should handle "What did we do yesterday?" query', async ({ page }) => {
    await page.fill('textarea[placeholder="Type your message..."]', 'What did we do yesterday?');
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForSelector('.assistant-message', { timeout: 10000 });
    
    const response = await page.textContent('.assistant-message:last-child');
    expect(response).toContain('yesterday');
    expect(response).not.toContain('I cannot provide specific details');
  });
  
  test('should handle "Show me last week\'s conversations" query', async ({ page }) => {
    await page.fill('textarea[placeholder="Type your message..."]', "Show me last week's conversations");
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('.assistant-message', { timeout: 10000 });
    
    const response = await page.textContent('.assistant-message:last-child');
    expect(response).toContain('last week');
  });
  
  test('should handle no sessions in date range gracefully', async ({ page }) => {
    await page.fill('textarea[placeholder="Type your message..."]', 'What did we discuss 5 years ago?');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('.assistant-message', { timeout: 10000 });
    
    const response = await page.textContent('.assistant-message:last-child');
    expect(response).toContain("don't have any conversation history");
  });
});
```

---

## Phase 6: Rollout Strategy

### 6.1 Feature Flag Implementation

**File:** `frontend/apps/web/src/lib/features/flags.ts` (NEW FILE)

```typescript
export interface FeatureFlags {
  temporalQueries: boolean;
  contextSummarization: boolean;
  tokenCounting: boolean;
}

export function getFeatureFlags(): FeatureFlags {
  return {
    temporalQueries: process.env.NEXT_PUBLIC_ENABLE_TEMPORAL_QUERIES === 'true',
    contextSummarization: process.env.NEXT_PUBLIC_ENABLE_CONTEXT_SUMMARIZATION === 'true',
    tokenCounting: process.env.NEXT_PUBLIC_ENABLE_TOKEN_COUNTING === 'true'
  };
}

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature];
}
```

**Environment Variables:**
```bash
# .env.local
NEXT_PUBLIC_ENABLE_TEMPORAL_QUERIES=true
NEXT_PUBLIC_ENABLE_CONTEXT_SUMMARIZATION=false
NEXT_PUBLIC_ENABLE_TOKEN_COUNTING=false
```

### 6.2 Gradual Rollout Plan

**Week 1: Internal Testing**
- Deploy to staging environment
- Enable feature flag for internal users only
- Run E2E tests
- Monitor error rates and performance

**Week 2: Beta Testing**
- Enable for 10% of users (A/B test)
- Collect user feedback
- Monitor query success rates
- Fix critical bugs

**Week 3: Gradual Rollout**
- Increase to 50% of users
- Monitor performance metrics
- Optimize database queries if needed
- Prepare for full rollout

**Week 4: Full Rollout**
- Enable for 100% of users
- Remove feature flag
- Document feature in user guide
- Monitor long-term performance

---

## Success Metrics

### Key Performance Indicators (KPIs)

1. **Temporal Query Success Rate**
   - Target: > 90% of temporal queries return relevant results
   - Measurement: Track queries with temporal keywords vs. successful responses

2. **Response Time**
   - Target: < 2 seconds for temporal queries
   - Measurement: Time from query submission to first response token

3. **User Satisfaction**
   - Target: > 80% positive feedback on temporal queries
   - Measurement: User ratings and feedback forms

4. **Database Performance**
   - Target: < 100ms for date-filtered session queries
   - Measurement: PostgreSQL query execution time

5. **Error Rate**
   - Target: < 1% error rate for temporal queries
   - Measurement: Failed queries / total temporal queries

---

## Risk Mitigation

### Identified Risks

1. **Timezone Handling Issues**
   - Risk: User's local time vs. server time mismatch
   - Mitigation: Store all timestamps in UTC, convert to user timezone in frontend
   - Fallback: Default to server timezone if user timezone unavailable

2. **Ambiguous Date References**
   - Risk: "last Monday" could mean different dates
   - Mitigation: Default to most recent interpretation
   - Fallback: Ask user for clarification if confidence < 0.7

3. **Database Performance Degradation**
   - Risk: Date range queries slow down with large datasets
   - Mitigation: Add proper indexes, implement query caching
   - Fallback: Limit date range to last 90 days

4. **No Sessions in Date Range**
   - Risk: User asks about date with no conversations
   - Mitigation: Return friendly message explaining no sessions found
   - Fallback: Suggest alternative date ranges

---

## Maintenance Plan

### Ongoing Maintenance Tasks

1. **Monitor Query Performance**
   - Weekly review of slow queries
   - Optimize indexes as needed
   - Archive old sessions to cold storage

2. **Update Temporal Patterns**
   - Add new temporal keywords based on user queries
   - Improve confidence scoring
   - Handle edge cases (holidays, weekends, etc.)

3. **Database Maintenance**
   - Monthly VACUUM and ANALYZE on sessions table
   - Monitor index usage and remove unused indexes
   - Archive sessions older than 1 year

4. **User Feedback Integration**
   - Collect feedback on temporal query accuracy
   - Iterate on prompt engineering
   - Add new temporal patterns based on user needs

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding temporal query capabilities to the ORION-CORE chat system. By following this plan, we can enable users to ask natural language questions about their conversation history and receive accurate, date-filtered results.

**Estimated Timeline:** 2-3 weeks  
**Priority:** HIGH  
**Expected Impact:** +30% user satisfaction, new use case enabled

---

**Next Steps:**
1. Review and approve this implementation plan
2. Create GitHub issues for each phase
3. Assign developers to tasks
4. Begin Phase 1 implementation
5. Schedule weekly progress reviews

