# Expenses API E2E Test Script

**Purpose**: Diagnose frontend-backend integration issues causing 400 errors

**Usage**: Copy and paste this script into the browser console at `https://www.sidekickportal.com/expenses`

---

## Quick Test Script (Browser Console)

```javascript
// ============================================================================
// EXPENSES API E2E TEST SUITE
// ============================================================================

console.log('🧪 Starting Expenses API E2E Test Suite...\n');

const API_BASE = 'https://fabric.sidekickportal.com';
const TEST_EMAIL = 'test@example.com';

// Test results tracking
let results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

// Helper: Make API request
async function testExpense(testName, payload) {
  console.log(`\n📝 ${testName}`);
  console.log('Payload:', payload);
  
  try {
    const response = await fetch(`${API_BASE}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    results.total++;
    
    if (response.ok) {
      console.log(`✅ PASS - Status: ${response.status}`);
      console.log('Response:', data);
      results.passed++;
      results.tests.push({ name: testName, status: 'PASS', payload, response: data });
    } else {
      console.error(`❌ FAIL - Status: ${response.status}`);
      console.error('Error:', data);
      results.failed++;
      results.tests.push({ name: testName, status: 'FAIL', payload, error: data });
    }
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`❌ FAIL - Network Error: ${error.message}`);
    results.total++;
    results.failed++;
    results.tests.push({ name: testName, status: 'FAIL', payload, error: error.message });
    return { success: false, error: error.message };
  }
}

// ============================================================================
// TEST 1: Simple Expense (Baseline)
// ============================================================================
async function test1_SimpleExpense() {
  return await testExpense('Test 1: Simple Expense (Baseline)', {
    user_email: TEST_EMAIL,
    amount: 1000, // $10.00 in cents
    expense_date: '2025-10-06',
    category: 'Food & Dining'
  });
}

// ============================================================================
// TEST 2: Expense with Optional Fields
// ============================================================================
async function test2_WithOptionalFields() {
  return await testExpense('Test 2: With Optional Fields', {
    user_email: TEST_EMAIL,
    amount: 2500, // $25.00 in cents
    expense_date: '2025-10-06',
    category: 'Transportation',
    merchant: 'Test Merchant',
    description: 'Test description',
    payment_method: 'credit_card',
    tags: ['test', 'e2e']
  });
}

// ============================================================================
// TEST 3: Recurring Expense (Monthly)
// ============================================================================
async function test3_RecurringMonthly() {
  return await testExpense('Test 3: Recurring Monthly', {
    user_email: TEST_EMAIL,
    amount: 5000, // $50.00 in cents
    expense_date: '2025-10-06',
    category: 'Utilities',
    is_recurring: true,
    recurrence_pattern: 'monthly',
    recurrence_start_date: '2025-10-06'
  });
}

// ============================================================================
// TEST 4: Recurring with End Date
// ============================================================================
async function test4_RecurringWithEndDate() {
  return await testExpense('Test 4: Recurring with End Date', {
    user_email: TEST_EMAIL,
    amount: 7500, // $75.00 in cents
    expense_date: '2025-10-06',
    category: 'Subscriptions',
    is_recurring: true,
    recurrence_pattern: 'monthly',
    recurrence_start_date: '2025-10-06',
    recurrence_end_date: '2025-12-31'
  });
}

// ============================================================================
// TEST 5: Edge Cases
// ============================================================================
async function test5_EdgeCases() {
  // 5a: Minimum required fields
  await testExpense('Test 5a: Minimum Fields', {
    user_email: TEST_EMAIL,
    amount: 100,
    expense_date: '2025-10-06'
  });
  
  // 5b: Recurring false explicitly
  await testExpense('Test 5b: Recurring False', {
    user_email: TEST_EMAIL,
    amount: 200,
    expense_date: '2025-10-06',
    is_recurring: false
  });
  
  // 5c: Amount as string (WRONG - should fail)
  await testExpense('Test 5c: Amount as String (Expected to Fail)', {
    user_email: TEST_EMAIL,
    amount: "10.00", // ❌ String instead of number
    expense_date: '2025-10-06'
  });
  
  // 5d: Boolean as string (WRONG - should fail)
  await testExpense('Test 5d: Boolean as String (Expected to Fail)', {
    user_email: TEST_EMAIL,
    amount: 300,
    expense_date: '2025-10-06',
    is_recurring: "true" // ❌ String instead of boolean
  });
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 EXPENSES API E2E TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  await test1_SimpleExpense();
  await test2_WithOptionalFields();
  await test3_RecurringMonthly();
  await test4_RecurringWithEndDate();
  await test5_EdgeCases();
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n🔍 FAILED TESTS:');
    results.tests.filter(t => t.status === 'FAIL').forEach(test => {
      console.log(`\n❌ ${test.name}`);
      console.log('Payload:', test.payload);
      console.log('Error:', test.error);
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
  
  return results;
}

// Auto-run tests
runAllTests();
```

---

## Expected Results

### ✅ Tests That Should PASS:
- Test 1: Simple Expense (Baseline)
- Test 2: With Optional Fields
- Test 3: Recurring Monthly
- Test 4: Recurring with End Date
- Test 5a: Minimum Fields
- Test 5b: Recurring False

### ❌ Tests That Should FAIL (by design):
- Test 5c: Amount as String (demonstrates wrong data type)
- Test 5d: Boolean as String (demonstrates wrong data type)

---

## Diagnosis Guide

### If ALL tests fail:
- **Issue**: Backend not running or not accessible
- **Check**: `curl https://fabric.sidekickportal.com/api/expenses`
- **Fix**: Restart backend service

### If only recurring tests fail:
- **Issue**: Database migration not run
- **Check**: Database has `is_recurring` column
- **Fix**: Run migration 005

### If Test 5c/5d pass (they shouldn't):
- **Issue**: Backend not validating data types
- **Check**: Backend code for type validation
- **Fix**: Add proper validation

### If simple tests pass but recurring fails:
- **Issue**: Recurring fields validation problem
- **Check**: Backend expects specific format for recurring fields
- **Fix**: Match frontend payload to backend expectations

---

## Frontend Payload Inspection

To see what the actual frontend is sending, add this to the expenses page:

```javascript
// Intercept fetch calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0].includes('/api/expenses')) {
    console.log('🔍 INTERCEPTED FETCH TO /api/expenses');
    console.log('URL:', args[0]);
    console.log('Options:', args[1]);
    if (args[1]?.body) {
      console.log('Payload:', JSON.parse(args[1].body));
    }
  }
  return originalFetch.apply(this, args);
};

console.log('✅ Fetch interceptor installed. Try creating an expense now.');
```

---

## Common Issues & Fixes

### Issue 1: Amount as String
**Symptom**: Test 5c passes (it shouldn't)
**Problem**: Frontend sending `amount: "10.00"` instead of `amount: 1000`
**Fix**: Convert to cents and ensure it's a number
```javascript
const amountInCents = Math.round(parseFloat(amount) * 100);
```

### Issue 2: Boolean as String
**Symptom**: Test 5d passes (it shouldn't)
**Problem**: Frontend sending `is_recurring: "true"` instead of `is_recurring: true`
**Fix**: Ensure boolean conversion
```javascript
const isRecurringBool = isRecurring === true || isRecurring === 'true';
```

### Issue 3: Missing user_email
**Symptom**: All tests fail with "Missing required field: user_email"
**Problem**: Frontend not including user_email
**Fix**: Get from session and include in payload
```javascript
const userEmail = session?.user?.email || "default@example.com";
payload.user_email = userEmail;
```

### Issue 4: Wrong Date Format
**Symptom**: Tests fail with date validation error
**Problem**: Frontend sending ISO format instead of YYYY-MM-DD
**Fix**: Format date correctly
```javascript
const formattedDate = new Date(date).toISOString().split('T')[0];
```

---

## Next Steps

1. Run the test script in browser console
2. Note which tests pass and which fail
3. Compare failing test payloads with backend expectations
4. Identify the specific field/type causing issues
5. Implement fix in frontend code
6. Re-run tests to verify fix
7. Test in production environment

