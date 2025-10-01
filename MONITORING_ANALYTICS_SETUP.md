# Monitoring & Analytics Setup - Temporal Queries

## Overview
Comprehensive monitoring and analytics for temporal query feature to track usage, performance, and user satisfaction.

---

## 1. Frontend Logging

### Console Logging Strategy

**Location:** `frontend/apps/web/src/components/chat/intelligent-chat.tsx`

**Current Logging:**
```typescript
// Temporal query detected
console.log(`✅ Temporal query detected: ${temporal.description}`, {
  sessionsFound: sessions.length,
  dateRange: { start: temporal.startDate, end: temporal.endDate }
});

// No sessions found
console.log(`ℹ️ Temporal query detected but no sessions found: ${temporal.description}`);

// Error handling
console.error('Error fetching temporal sessions:', error);
```

**Enhanced Logging (Recommended):**
```typescript
// Add structured logging
const logTemporalQuery = (event: string, data: any) => {
  console.log(`[TEMPORAL-QUERY] ${event}`, {
    timestamp: new Date().toISOString(),
    userId: getUserId(),
    ...data
  });
};

// Usage
logTemporalQuery('DETECTED', {
  pattern: temporal.description,
  confidence: temporal.confidence,
  query: messageContent
});

logTemporalQuery('SESSIONS_FETCHED', {
  count: sessions.length,
  dateRange: { start: temporal.startDate, end: temporal.endDate }
});

logTemporalQuery('ERROR', {
  error: error.message,
  stack: error.stack
});
```

---

## 2. Performance Monitoring

### Metrics to Track

**1. Temporal Query Detection Time**
```typescript
const startDetection = performance.now();
const temporal = parseTemporalQuery(messageContent);
const detectionTime = performance.now() - startDetection;

console.log(`[PERF] Temporal detection: ${detectionTime.toFixed(2)}ms`);
```

**2. Session Fetch Time**
```typescript
const startFetch = performance.now();
const sessions = await getUserSessions(userId, options);
const fetchTime = performance.now() - startFetch;

console.log(`[PERF] Session fetch: ${fetchTime.toFixed(2)}ms`);
```

**3. Context Building Time**
```typescript
const startContext = performance.now();
const contextPrefix = buildContextPrefix(sessions, temporal);
const contextTime = performance.now() - startContext;

console.log(`[PERF] Context building: ${contextTime.toFixed(2)}ms`);
```

**4. Total Query Time**
```typescript
const startTotal = performance.now();
// ... entire temporal query flow
const totalTime = performance.now() - startTotal;

console.log(`[PERF] Total temporal query: ${totalTime.toFixed(2)}ms`);
```

### Performance Thresholds
- **Detection:** < 1ms (GOOD), 1-5ms (OK), > 5ms (SLOW)
- **Fetch:** < 100ms (GOOD), 100-500ms (OK), > 500ms (SLOW)
- **Context:** < 5ms (GOOD), 5-20ms (OK), > 20ms (SLOW)
- **Total:** < 1s (GOOD), 1-3s (OK), > 3s (SLOW)

---

## 3. Analytics Events

### Event Tracking Structure

**Event 1: Temporal Query Detected**
```typescript
{
  event: 'temporal_query_detected',
  properties: {
    pattern: 'yesterday',
    confidence: 1.0,
    query_length: 25,
    has_sessions: true,
    session_count: 3,
    user_id: 'user123',
    timestamp: '2025-10-01T12:00:00Z'
  }
}
```

**Event 2: Temporal Query Success**
```typescript
{
  event: 'temporal_query_success',
  properties: {
    pattern: 'yesterday',
    sessions_found: 3,
    response_time_ms: 250,
    context_length: 500,
    user_id: 'user123',
    timestamp: '2025-10-01T12:00:00Z'
  }
}
```

**Event 3: Temporal Query No Results**
```typescript
{
  event: 'temporal_query_no_results',
  properties: {
    pattern: 'last month',
    date_range: { start: '2025-09-01', end: '2025-09-30' },
    user_id: 'user123',
    timestamp: '2025-10-01T12:00:00Z'
  }
}
```

**Event 4: Temporal Query Error**
```typescript
{
  event: 'temporal_query_error',
  properties: {
    pattern: 'yesterday',
    error_type: 'NetworkError',
    error_message: 'Failed to fetch sessions',
    user_id: 'user123',
    timestamp: '2025-10-01T12:00:00Z'
  }
}
```

### Integration with Analytics Platforms

**Google Analytics 4:**
```typescript
// Add to intelligent-chat.tsx
import { gtag } from '@/lib/analytics';

// Track temporal query
gtag('event', 'temporal_query_detected', {
  pattern: temporal.description,
  confidence: temporal.confidence,
  sessions_found: sessions.length
});
```

**Mixpanel:**
```typescript
import mixpanel from 'mixpanel-browser';

mixpanel.track('Temporal Query Detected', {
  pattern: temporal.description,
  confidence: temporal.confidence,
  sessions_found: sessions.length
});
```

**Custom Analytics:**
```typescript
// Send to custom analytics endpoint
await fetch('/api/analytics/temporal-query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'temporal_query_detected',
    properties: { /* ... */ }
  })
});
```

---

## 4. Error Tracking

### Sentry Integration

**Setup:**
```typescript
import * as Sentry from '@sentry/nextjs';

// In intelligent-chat.tsx
try {
  const sessions = await getUserSessions(userId, options);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      feature: 'temporal_queries',
      pattern: temporal.description
    },
    extra: {
      userId,
      dateRange: { start: temporal.startDate, end: temporal.endDate }
    }
  });
  
  console.error('Error fetching temporal sessions:', error);
}
```

### Error Categories

**1. Network Errors**
- Failed to fetch sessions
- Timeout errors
- Connection refused

**2. Parsing Errors**
- Invalid date format
- Malformed response

**3. Logic Errors**
- Invalid date range
- Confidence threshold issues

**4. Performance Errors**
- Query timeout (> 5s)
- Memory overflow

---

## 5. Dashboard Metrics

### Key Metrics to Display

**Usage Metrics:**
- Total temporal queries (daily/weekly/monthly)
- Temporal queries as % of total queries
- Most common temporal patterns
- Average queries per user

**Performance Metrics:**
- Average response time
- P50, P95, P99 latency
- Error rate
- Success rate (sessions found)

**User Engagement:**
- Users using temporal queries
- Repeat usage rate
- Session count per temporal query
- User satisfaction (if feedback available)

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│                  Temporal Queries Dashboard                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 Usage Overview                                           │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ Total Queries│ Success Rate │ Avg Response │            │
│  │    1,234     │    87.5%     │    250ms     │            │
│  └──────────────┴──────────────┴──────────────┘            │
│                                                              │
│  📈 Temporal Patterns (Last 7 Days)                         │
│  ┌────────────────────────────────────────────┐            │
│  │ yesterday        ████████████ 45%           │            │
│  │ last week        ██████ 25%                 │            │
│  │ today            ████ 15%                   │            │
│  │ recently         ██ 10%                     │            │
│  │ last month       █ 5%                       │            │
│  └────────────────────────────────────────────┘            │
│                                                              │
│  ⚡ Performance Metrics                                      │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ P50 Latency  │ P95 Latency  │ P99 Latency  │            │
│  │    180ms     │    450ms     │    850ms     │            │
│  └──────────────┴──────────────┴──────────────┘            │
│                                                              │
│  🚨 Error Rate (Last 24h)                                   │
│  ┌────────────────────────────────────────────┐            │
│  │ Network Errors:     2 (0.5%)               │            │
│  │ Parsing Errors:     0 (0.0%)               │            │
│  │ Logic Errors:       1 (0.3%)               │            │
│  │ Performance Errors: 0 (0.0%)               │            │
│  └────────────────────────────────────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Alerting Rules

### Critical Alerts (Immediate Action)

**1. High Error Rate**
- **Condition:** Error rate > 5% in last 15 minutes
- **Action:** Page on-call engineer
- **Severity:** CRITICAL

**2. Performance Degradation**
- **Condition:** P95 latency > 3 seconds for 10 minutes
- **Action:** Send Slack alert
- **Severity:** HIGH

**3. Zero Success Rate**
- **Condition:** No successful temporal queries in last 30 minutes
- **Action:** Page on-call engineer
- **Severity:** CRITICAL

### Warning Alerts (Monitor)

**4. Elevated Error Rate**
- **Condition:** Error rate > 2% in last hour
- **Action:** Send email alert
- **Severity:** MEDIUM

**5. Slow Queries**
- **Condition:** P95 latency > 1 second for 30 minutes
- **Action:** Send Slack alert
- **Severity:** MEDIUM

**6. Low Usage**
- **Condition:** < 10 temporal queries in last 24 hours
- **Action:** Send email alert
- **Severity:** LOW

---

## 7. A/B Testing Setup

### Test Variations

**Variation A: Current Implementation**
- Confidence threshold: 0.7
- Max sessions: 20
- Context format: List

**Variation B: Stricter Confidence**
- Confidence threshold: 0.8
- Max sessions: 20
- Context format: List

**Variation C: More Sessions**
- Confidence threshold: 0.7
- Max sessions: 50
- Context format: Grouped by date

### Metrics to Compare
- Success rate (sessions found)
- User satisfaction
- Response quality
- Performance impact

---

## 8. User Feedback Collection

### Feedback Mechanism

**Thumbs Up/Down:**
```typescript
// Add after temporal query response
<div className="feedback-buttons">
  <button onClick={() => trackFeedback('positive', temporal.description)}>
    👍 Helpful
  </button>
  <button onClick={() => trackFeedback('negative', temporal.description)}>
    👎 Not Helpful
  </button>
</div>
```

**Detailed Feedback:**
```typescript
// Optional detailed feedback form
<textarea 
  placeholder="Tell us more about your experience..."
  onChange={(e) => setFeedbackText(e.target.value)}
/>
<button onClick={() => submitDetailedFeedback(temporal.description, feedbackText)}>
  Submit Feedback
</button>
```

### Feedback Analysis
- Positive feedback rate
- Common complaints
- Feature requests
- Pattern-specific feedback

---

## 9. Database Queries for Analytics

### SQL Queries

**1. Most Common Temporal Patterns:**
```sql
SELECT 
  metadata->>'temporalContext'->>'description' as pattern,
  COUNT(*) as count,
  AVG((metadata->>'temporalContext'->>'confidence')::float) as avg_confidence
FROM messages
WHERE metadata->>'temporalContext' IS NOT NULL
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY pattern
ORDER BY count DESC
LIMIT 10;
```

**2. Success Rate by Pattern:**
```sql
SELECT 
  metadata->>'temporalContext'->>'description' as pattern,
  COUNT(*) as total_queries,
  SUM(CASE WHEN metadata->>'sessionsFound' > 0 THEN 1 ELSE 0 END) as successful_queries,
  ROUND(100.0 * SUM(CASE WHEN metadata->>'sessionsFound' > 0 THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM messages
WHERE metadata->>'temporalContext' IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY pattern
ORDER BY total_queries DESC;
```

**3. Performance by Time of Day:**
```sql
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as query_count,
  AVG((metadata->>'responseTime')::int) as avg_response_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (metadata->>'responseTime')::int) as p95_response_time_ms
FROM messages
WHERE metadata->>'temporalContext' IS NOT NULL
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;
```

---

## 10. Implementation Checklist

### Phase 1: Basic Monitoring (Week 1)
- ✅ Add console logging
- ✅ Track performance metrics
- ⏳ Set up error tracking (Sentry)
- ⏳ Create basic analytics events

### Phase 2: Advanced Analytics (Week 2)
- ⏳ Integrate with Google Analytics
- ⏳ Create custom analytics endpoint
- ⏳ Set up dashboard
- ⏳ Configure alerting rules

### Phase 3: User Feedback (Week 3)
- ⏳ Add feedback buttons
- ⏳ Create feedback collection system
- ⏳ Analyze feedback data
- ⏳ Iterate based on findings

### Phase 4: Optimization (Week 4+)
- ⏳ A/B testing setup
- ⏳ Performance optimization
- ⏳ Feature enhancements
- ⏳ Continuous improvement

---

## 11. Monitoring Tools

### Recommended Tools

**1. Application Performance Monitoring (APM):**
- New Relic
- Datadog
- Dynatrace

**2. Error Tracking:**
- Sentry
- Rollbar
- Bugsnag

**3. Analytics:**
- Google Analytics 4
- Mixpanel
- Amplitude

**4. Logging:**
- Loggly
- Papertrail
- CloudWatch Logs

**5. Dashboards:**
- Grafana
- Kibana
- Custom React dashboard

---

## 12. Success Metrics

### Week 1 Targets:
- ✅ Monitoring setup complete
- ✅ Basic logging in place
- ✅ Error tracking configured
- ✅ Performance baseline established

### Month 1 Targets:
- ⏳ 100+ temporal queries processed
- ⏳ < 2% error rate
- ⏳ < 1s average response time
- ⏳ > 80% success rate (sessions found)

### Quarter 1 Targets:
- ⏳ 1,000+ temporal queries processed
- ⏳ < 1% error rate
- ⏳ < 500ms average response time
- ⏳ > 85% success rate
- ⏳ > 70% positive feedback

---

**Document Version:** 1.0  
**Last Updated:** October 1, 2025  
**Owner:** ORION-CORE Team

