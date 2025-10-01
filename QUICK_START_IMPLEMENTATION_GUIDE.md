# Quick Start Implementation Guide - Temporal Queries

**For Developers:** This is a condensed guide to implement temporal query capabilities in ORION-CORE chat system.

---

## 🚀 Quick Setup (30 minutes)

### Step 1: Install Dependencies

```bash
cd /tank/webhosting/sites/ai-marketplace
npm install date-fns tiktoken
```

### Step 2: Create Temporal Parser

Create file: `frontend/apps/web/src/lib/temporal/parser.ts`

```typescript
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

export interface TemporalRange {
  startDate: Date;
  endDate: Date;
  description: string;
  confidence: number;
}

export function parseTemporalQuery(query: string): TemporalRange | null {
  const now = new Date();
  const lowerQuery = query.toLowerCase();
  
  if (/yesterday/.test(lowerQuery)) {
    const yesterday = subDays(now, 1);
    return {
      startDate: startOfDay(yesterday),
      endDate: endOfDay(yesterday),
      description: "yesterday",
      confidence: 1.0
    };
  }
  
  if (/today|this morning/.test(lowerQuery)) {
    return {
      startDate: startOfDay(now),
      endDate: now,
      description: "today",
      confidence: 1.0
    };
  }
  
  if (/last week/.test(lowerQuery)) {
    const lastWeek = subWeeks(now, 1);
    return {
      startDate: startOfWeek(lastWeek, { weekStartsOn: 1 }),
      endDate: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      description: "last week",
      confidence: 0.9
    };
  }
  
  const daysMatch = lowerQuery.match(/last (\d+) days?/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    return {
      startDate: subDays(now, days),
      endDate: now,
      description: `last ${days} days`,
      confidence: 1.0
    };
  }
  
  return null;
}
```

### Step 3: Update Session Client

Modify: `frontend/apps/web/src/lib/session/client.ts`

```typescript
// Add interface
export interface SessionFilterOptions {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

// Update function
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

### Step 4: Update Chat Component

Modify: `frontend/apps/web/src/components/chat/intelligent-chat.tsx`

```typescript
import { parseTemporalQuery } from '@/lib/temporal/parser';
import { getUserSessions } from '@/lib/session/client';

// In sendMessage function, add before startStream:
const temporal = parseTemporalQuery(messageContent);

if (temporal && temporal.confidence >= 0.7) {
  try {
    const userId = getUserId();
    const sessions = await getUserSessions(userId, {
      startDate: temporal.startDate,
      endDate: temporal.endDate,
      limit: 20
    });
    
    if (sessions.length > 0) {
      const sessionSummaries = sessions.map(s => 
        `- "${s.title || 'Untitled'}" (${s.messageCount} messages, ${new Date(s.createdAt).toLocaleDateString()})`
      ).join('\n');
      
      const contextPrefix = `Based on our conversation history from ${temporal.description}, here's what we discussed:\n\n${sessionSummaries}\n\nNow, regarding your question: `;
      messageContent = contextPrefix + messageContent;
    }
  } catch (error) {
    console.error('Error fetching temporal sessions:', error);
  }
}
```

### Step 5: Add Database Indexes

```bash
psql -h 192.168.50.79 -U orion_user -d orion_core << 'SQL'
CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_updated ON sessions(user_id, updated_at DESC);
ANALYZE sessions;
SQL
```

### Step 6: Test

```bash
# Build
npm run build

# Test queries
# - "What did we do yesterday?"
# - "Show me last week's conversations"
# - "What did we discuss today?"
```

---

## 📋 Testing Checklist

- [ ] "What did we do yesterday?" returns sessions from yesterday
- [ ] "Show me last week's conversations" returns sessions from last week
- [ ] "What did we discuss today?" returns sessions from today
- [ ] "Show me last 3 days" returns sessions from last 3 days
- [ ] No sessions in date range returns friendly message
- [ ] Non-temporal queries work normally

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'date-fns'"
**Solution:** Run `npm install date-fns`

### Issue: Database query slow
**Solution:** Verify indexes exist:
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'sessions';
```

### Issue: Temporal queries not detected
**Solution:** Check console logs for parser output:
```typescript
console.log('Temporal result:', parseTemporalQuery(query));
```

---

## 📚 Full Documentation

For complete implementation details, see:
- `LLM_API_BEST_PRACTICES_RESEARCH_REPORT.md` (research findings)
- `TEMPORAL_QUERY_IMPLEMENTATION_PLAN.md` (detailed implementation)
- `RESEARCH_AUDIT_EXECUTIVE_SUMMARY.md` (executive summary)

