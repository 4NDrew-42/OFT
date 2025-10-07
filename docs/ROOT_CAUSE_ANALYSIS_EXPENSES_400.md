# ROOT CAUSE ANALYSIS: Expenses API 400 Error

**Date**: October 6, 2025, 10:00 PM CDT
**Status**: ✅ ROOT CAUSE IDENTIFIED

---

## 🔍 INVESTIGATION SUMMARY

### Backend Status
- ✅ Backend code updated with recurring fields support (commit 48eca20)
- ✅ Backend service restarted at 9:45 PM CDT
- ✅ Database migration 005 applied (recurring columns exist)
- ✅ Direct API testing successful (both localhost and public URL)

### Frontend Analysis
- ✅ Frontend page.tsx correctly builds payload with recurring fields
- ✅ Frontend sends `is_recurring`, `recurrence_pattern`, `recurrence_start_date`, `recurrence_end_date`
- ❌ **ISSUE FOUND**: `orionClient.ts` TypeScript interface missing recurring fields

---

## 🎯 ROOT CAUSE

**File**: `frontend/apps/web/src/lib/orionClient.ts`
**Function**: `createExpense()`

**Current Interface** (INCOMPLETE):
```typescript
export async function createExpense(expense: {
  user_email: string;
  amount: number;
  expense_date: string;
  category?: string;
  merchant?: string;
  description?: string;
  payment_method?: string;
  receipt_image_data?: string;
  tags?: string[];
}, token: string) {
  // ...
}
```

**Missing Fields**:
- `is_recurring?: boolean`
- `recurrence_pattern?: string`
- `recurrence_start_date?: string`
- `recurrence_end_date?: string`

---

## 📊 EVIDENCE

### Frontend Code (page.tsx) - CORRECT
```typescript
// Lines 240-248
if (isRecurring) {
  expenseData.is_recurring = true;
  expenseData.recurrence_pattern = recurrencePattern;
  expenseData.recurrence_start_date = recurrenceStartDate;
  if (recurrenceEndDate) {
    expenseData.recurrence_end_date = recurrenceEndDate;
  }
}
```

### orionClient.ts Interface - INCOMPLETE
```typescript
// Missing recurring fields in type definition
export async function createExpense(expense: {
  user_email: string;
  amount: number;
  expense_date: string;
  // ... other fields ...
  // ❌ NO RECURRING FIELDS
}, token: string)
```

---

## 💡 WHY THIS CAUSES 400 ERROR

**Hypothesis 1: TypeScript Compilation**
- TypeScript might be stripping out fields not in the interface
- When compiled, recurring fields might not be included in the request

**Hypothesis 2: Type Mismatch**
- Frontend sends `amount: 10.5` (number with decimals)
- Backend expects `amount: 1050` (cents as integer)
- Type coercion might be failing

**Hypothesis 3: Data Type Issues**
- Frontend might be sending `amount` as string instead of number
- Frontend might be sending `is_recurring` as string instead of boolean

---

## 🔧 REQUIRED FIXES

### Fix 1: Update orionClient.ts Interface (CRITICAL)
```typescript
export async function createExpense(expense: {
  user_email: string;
  amount: number;
  expense_date: string;
  category?: string;
  merchant?: string;
  description?: string;
  payment_method?: string;
  receipt_image_data?: string;
  tags?: string[];
  // ADD THESE:
  is_recurring?: boolean;
  recurrence_pattern?: string;
  recurrence_start_date?: string;
  recurrence_end_date?: string;
}, token: string) {
  const r = await fetch(`https://fabric.sidekickportal.com/api/expenses`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(expense)
  });
  if (!r.ok) throw new Error(`Create expense error ${r.status}`);
  return r.json();
}
```

### Fix 2: Ensure Amount is in Cents (VERIFY)
```typescript
// In page.tsx, line 215
const amountNum = parseFloat(expenseAmount);

// Should be:
const amountInCents = Math.round(parseFloat(expenseAmount) * 100);

// Then use:
expenseData.amount = amountInCents;
```

### Fix 3: Update updateExpense Interface
```typescript
export async function updateExpense(expenseId: string, updates: Partial<{
  amount: number;
  expense_date: string;
  category: string;
  merchant: string;
  description: string;
  payment_method: string;
  receipt_image_data: string;
  tags: string[];
  // ADD THESE:
  is_recurring: boolean;
  recurrence_pattern: string;
  recurrence_start_date: string;
  recurrence_end_date: string;
}>, token: string)
```

---

## 🧪 VERIFICATION PLAN

### Step 1: Update orionClient.ts
- Add recurring fields to `createExpense` interface
- Add recurring fields to `updateExpense` interface
- Rebuild frontend

### Step 2: Test Amount Conversion
- Verify frontend sends amount in cents (not dollars)
- Check if `amountNum` needs to be multiplied by 100

### Step 3: Run E2E Tests
- Use the test script to verify all scenarios
- Test simple expense (baseline)
- Test recurring expense
- Verify payload format

### Step 4: Production Verification
- Deploy updated frontend
- Test expense creation in production
- Verify no 400 errors

---

## 📝 NEXT STEPS

1. ✅ Update `orionClient.ts` with recurring fields
2. ⏳ Verify amount conversion (cents vs dollars)
3. ⏳ Rebuild frontend
4. ⏳ Deploy to production
5. ⏳ Run E2E tests
6. ⏳ Verify in browser

---

## 🎯 EXPECTED OUTCOME

After fixes:
- ✅ TypeScript interface matches backend API contract
- ✅ Recurring fields properly typed and sent
- ✅ Amount sent in correct format (cents)
- ✅ No 400 errors in production
- ✅ All E2E tests pass

