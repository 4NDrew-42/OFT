# End-to-End Testing Plan - Temporal Queries

## Test Environment
- **URL:** https://www.sidekickportal.com/assistant
- **Backend:** http://192.168.50.79:3002
- **Test User:** Create dedicated test account

---

## Test Scenarios

### Scenario 1: Yesterday Query
**Test Case:** TC-TEMP-001  
**Priority:** HIGH  
**Description:** Verify "yesterday" temporal query works correctly

**Steps:**
1. Navigate to https://www.sidekickportal.com/assistant
2. Ensure at least 2 sessions exist from yesterday
3. Enter query: "What did we do yesterday?"
4. Wait for response

**Expected Results:**
- ✅ Temporal query detected (check console logs)
- ✅ Sessions from yesterday fetched
- ✅ Context prefix includes session summaries
- ✅ LLM response references yesterday's topics
- ✅ No errors in console
- ✅ Response time < 3 seconds

**Actual Results:** _To be filled during testing_

---

### Scenario 2: Last Week Query
**Test Case:** TC-TEMP-002  
**Priority:** HIGH  
**Description:** Verify "last week" temporal query works correctly

**Steps:**
1. Navigate to assistant page
2. Ensure sessions exist from last week
3. Enter query: "Show me last week's conversations"
4. Wait for response

**Expected Results:**
- ✅ Temporal query detected with confidence 0.9
- ✅ Week boundaries calculated correctly (Monday-Sunday)
- ✅ Multiple sessions summarized
- ✅ Response includes date range
- ✅ No errors

**Actual Results:** _To be filled during testing_

---

### Scenario 3: No Sessions in Range
**Test Case:** TC-TEMP-003  
**Priority:** MEDIUM  
**Description:** Verify graceful handling when no sessions exist

**Steps:**
1. Navigate to assistant page
2. Enter query: "What did we discuss 5 years ago?"
3. Wait for response

**Expected Results:**
- ✅ Temporal query detected
- ✅ Friendly message: "I don't have any conversation history from..."
- ✅ No errors or crashes
- ✅ System remains responsive

**Actual Results:** _To be filled during testing_

---

### Scenario 4: Non-Temporal Query
**Test Case:** TC-TEMP-004  
**Priority:** HIGH  
**Description:** Verify non-temporal queries work normally

**Steps:**
1. Navigate to assistant page
2. Enter query: "What is the capital of France?"
3. Wait for response

**Expected Results:**
- ✅ No temporal query detected
- ✅ Normal query processing
- ✅ Correct answer: "Paris"
- ✅ No performance degradation
- ✅ No errors

**Actual Results:** _To be filled during testing_

---

### Scenario 5: Today Query
**Test Case:** TC-TEMP-005  
**Priority:** HIGH  
**Description:** Verify "today" temporal query works correctly

**Steps:**
1. Navigate to assistant page
2. Create at least 1 session today
3. Enter query: "What did we discuss today?"
4. Wait for response

**Expected Results:**
- ✅ Temporal query detected
- ✅ Sessions from today fetched
- ✅ Date range: start of day to current time
- ✅ Response includes today's topics

**Actual Results:** _To be filled during testing_

---

### Scenario 6: Numeric Pattern Query
**Test Case:** TC-TEMP-006  
**Priority:** MEDIUM  
**Description:** Verify "last N days" pattern works

**Steps:**
1. Navigate to assistant page
2. Enter query: "Show me last 3 days"
3. Wait for response

**Expected Results:**
- ✅ Temporal query detected
- ✅ Numeric parsing works (3 days)
- ✅ Date range calculated correctly
- ✅ Sessions from last 3 days fetched

**Actual Results:** _To be filled during testing_

---

### Scenario 7: Recently Query
**Test Case:** TC-TEMP-007  
**Priority:** MEDIUM  
**Description:** Verify "recently" fuzzy pattern works

**Steps:**
1. Navigate to assistant page
2. Enter query: "What have we discussed recently?"
3. Wait for response

**Expected Results:**
- ✅ Temporal query detected with confidence 0.7
- ✅ Defaults to last 7 days
- ✅ Multiple sessions summarized
- ✅ Response covers recent topics

**Actual Results:** _To be filled during testing_

---

### Scenario 8: Performance Test
**Test Case:** TC-TEMP-008  
**Priority:** HIGH  
**Description:** Verify temporal queries don't degrade performance

**Steps:**
1. Navigate to assistant page
2. Enter 5 temporal queries in sequence
3. Measure response times

**Expected Results:**
- ✅ Average response time < 3 seconds
- ✅ No memory leaks
- ✅ No console errors
- ✅ UI remains responsive

**Actual Results:** _To be filled during testing_

---

### Scenario 9: Edge Case - Multiple Temporal Keywords
**Test Case:** TC-TEMP-009  
**Priority:** LOW  
**Description:** Verify handling of multiple temporal keywords

**Steps:**
1. Navigate to assistant page
2. Enter query: "What did we do yesterday and last week?"
3. Wait for response

**Expected Results:**
- ✅ First temporal keyword detected ("yesterday")
- ✅ Query processed correctly
- ✅ No confusion or errors

**Actual Results:** _To be filled during testing_

---

### Scenario 10: Case Sensitivity Test
**Test Case:** TC-TEMP-010  
**Priority:** LOW  
**Description:** Verify case-insensitive temporal detection

**Steps:**
1. Navigate to assistant page
2. Enter query: "WHAT DID WE DO YESTERDAY?"
3. Wait for response

**Expected Results:**
- ✅ Temporal query detected (case-insensitive)
- ✅ Normal processing
- ✅ Correct results

**Actual Results:** _To be filled during testing_

---

## Browser Compatibility Testing

### Browsers to Test:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Chrome (Android)
- ✅ Mobile Safari (iOS)

### Test Matrix:
| Browser | TC-001 | TC-002 | TC-003 | TC-004 | TC-005 |
|---------|--------|--------|--------|--------|--------|
| Chrome  | ⏳     | ⏳     | ⏳     | ⏳     | ⏳     |
| Firefox | ⏳     | ⏳     | ⏳     | ⏳     | ⏳     |
| Safari  | ⏳     | ⏳     | ⏳     | ⏳     | ⏳     |
| Edge    | ⏳     | ⏳     | ⏳     | ⏳     | ⏳     |

---

## Performance Benchmarks

### Metrics to Measure:
1. **Temporal Query Detection Time:** < 1ms
2. **Date Range Calculation Time:** < 1ms
3. **Session Fetch Time:** < 200ms
4. **Context Building Time:** < 5ms
5. **Total Query Time:** < 3 seconds
6. **Memory Usage:** < 50MB increase
7. **Bundle Size Impact:** < 5KB

### Tools:
- Chrome DevTools Performance tab
- Lighthouse
- Network tab for API timing
- Memory profiler

---

## Monitoring Setup

### Console Logging
Monitor for these log messages:
```
✅ Temporal query detected: yesterday
ℹ️ Temporal query detected but no sessions found: yesterday
❌ Error fetching temporal sessions: [error]
```

### Error Tracking
Monitor for:
- TypeScript errors
- Runtime errors
- API errors (4xx, 5xx)
- Network timeouts

### Analytics
Track:
- Temporal query usage frequency
- Most common temporal patterns
- Success rate (sessions found vs. not found)
- Average response time
- User satisfaction (if feedback available)

---

## Regression Testing

### Before Each Deployment:
1. Run all 10 test scenarios
2. Verify no console errors
3. Check performance metrics
4. Test on all browsers
5. Verify backward compatibility

### Automated Testing:
- Set up Playwright/Cypress tests
- Run on CI/CD pipeline
- Alert on failures

---

## Test Data Setup

### Required Test Data:
1. **Yesterday:** Create 2-3 sessions from yesterday
2. **Last Week:** Create 5-10 sessions from last week
3. **Today:** Create 1-2 sessions today
4. **Last Month:** Create 3-5 sessions from last month
5. **Old Data:** Create 1-2 sessions from 1+ year ago

### Test Data Script:
```typescript
// Create test sessions with specific dates
async function createTestData() {
  const yesterday = subDays(new Date(), 1);
  await createSession('user123', 'Test session from yesterday', yesterday);
  
  const lastWeek = subWeeks(new Date(), 1);
  await createSession('user123', 'Test session from last week', lastWeek);
  
  // ... more test data
}
```

---

## Success Criteria

### Must Pass:
- ✅ All HIGH priority test cases pass
- ✅ No console errors
- ✅ Performance metrics within limits
- ✅ Works on all major browsers
- ✅ Backward compatibility maintained

### Nice to Have:
- ✅ All MEDIUM priority test cases pass
- ✅ All LOW priority test cases pass
- ✅ Automated tests set up
- ✅ Monitoring dashboard created

---

## Test Execution Schedule

### Phase 1: Manual Testing (Week 1)
- Day 1: TC-001 to TC-005 (HIGH priority)
- Day 2: TC-006 to TC-010 (MEDIUM/LOW priority)
- Day 3: Browser compatibility testing
- Day 4: Performance testing
- Day 5: Regression testing

### Phase 2: Automated Testing (Week 2)
- Day 1-2: Write Playwright tests
- Day 3: Set up CI/CD integration
- Day 4: Run automated tests
- Day 5: Fix any issues found

### Phase 3: Production Monitoring (Ongoing)
- Monitor error rates
- Track performance metrics
- Collect user feedback
- Iterate based on findings

---

## Issue Tracking

### Template for Bug Reports:
```
**Bug ID:** BUG-TEMP-XXX
**Severity:** Critical/High/Medium/Low
**Test Case:** TC-TEMP-XXX
**Description:** [What went wrong]
**Steps to Reproduce:** [Detailed steps]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Screenshots:** [If applicable]
**Console Logs:** [Error messages]
**Environment:** [Browser, OS, etc.]
**Status:** Open/In Progress/Fixed/Closed
```

---

## Sign-Off

### Test Lead: _________________  
### Date: _________________  
### Status: ⏳ Pending / ✅ Passed / ❌ Failed  

