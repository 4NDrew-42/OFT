#!/bin/bash
# Automated fix script for Expenses API 400 error
# Date: October 6, 2025
# Issues: Missing recurring fields in TypeScript + amount in dollars instead of cents

set -e

cd /tank/webhosting/sites/ai-marketplace

echo "═══════════════════════════════════════════════════════════"
echo "🔧 EXPENSES API FIX SCRIPT"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Backup original files
echo "📦 Creating backups..."
cp frontend/apps/web/src/lib/orionClient.ts frontend/apps/web/src/lib/orionClient.ts.backup.$(date +%Y%m%d_%H%M%S)
cp frontend/apps/web/src/app/expenses/page.tsx frontend/apps/web/src/app/expenses/page.tsx.backup.$(date +%Y%m%d_%H%M%S)
echo "✓ Backups created"
echo ""

# Fix 1: Add recurring fields to createExpense interface
echo "🔧 Fix 1: Adding recurring fields to createExpense interface..."
cat > /tmp/orionClient_fix1.txt << 'EOF'
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
EOF

# Replace createExpense function
python3 << 'PYTHON'
import re

with open('frontend/apps/web/src/lib/orionClient.ts', 'r') as f:
    content = f.read()

# Find and replace createExpense function
pattern = r'export async function createExpense\(expense: \{[^}]+\}, token: string\) \{[^}]+\}'
with open('/tmp/orionClient_fix1.txt', 'r') as f:
    replacement = f.read().strip()

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('frontend/apps/web/src/lib/orionClient.ts', 'w') as f:
    f.write(content)

print("✓ createExpense interface updated")
PYTHON

echo ""

# Fix 2: Add recurring fields to updateExpense interface
echo "🔧 Fix 2: Adding recurring fields to updateExpense interface..."
python3 << 'PYTHON'
import re

with open('frontend/apps/web/src/lib/orionClient.ts', 'r') as f:
    content = f.read()

# Find updateExpense and add recurring fields
old_pattern = r'(export async function updateExpense\(expenseId: string, updates: Partial<\{[^}]+)(tags: string\[\];)(\}>, token: string\))'
new_middle = r'\2\n  is_recurring: boolean;\n  recurrence_pattern: string;\n  recurrence_start_date: string;\n  recurrence_end_date: string;'
replacement = r'\1' + new_middle + r'\3'

content = re.sub(old_pattern, replacement, content)

with open('frontend/apps/web/src/lib/orionClient.ts', 'w') as f:
    f.write(content)

print("✓ updateExpense interface updated")
PYTHON

echo ""

# Fix 3: Convert amount to cents in page.tsx
echo "🔧 Fix 3: Converting amount from dollars to cents..."
python3 << 'PYTHON'
import re

with open('frontend/apps/web/src/app/expenses/page.tsx', 'r') as f:
    content = f.read()

# Find the line with "amount: amountNum," and replace it
content = re.sub(
    r'amount: amountNum,',
    'amount: Math.round(amountNum * 100),  // Convert dollars to cents',
    content
)

with open('frontend/apps/web/src/app/expenses/page.tsx', 'w') as f:
    f.write(content)

print("✓ Amount conversion updated")
PYTHON

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ ALL FIXES APPLIED SUCCESSFULLY"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📋 Changes made:"
echo "  1. Added recurring fields to createExpense interface"
echo "  2. Added recurring fields to updateExpense interface"
echo "  3. Converted amount from dollars to cents"
echo ""
echo "🔍 Review changes:"
echo "  git diff frontend/apps/web/src/lib/orionClient.ts"
echo "  git diff frontend/apps/web/src/app/expenses/page.tsx"
echo ""
echo "🏗️  Next steps:"
echo "  1. cd frontend/apps/web"
echo "  2. npm run build"
echo "  3. Test locally or deploy to production"
echo "  4. Run E2E tests to verify"
echo ""
