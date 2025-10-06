-- Migration 005: Add recurring transaction support to expenses
-- Date: 2025-10-06
-- Description: Add recurring fields to expenses table

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(50);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrence_start_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS next_occurrence_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS parent_recurring_id UUID REFERENCES expenses(id) ON DELETE SET NULL;

-- Indexes for recurring expenses
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON expenses(is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX IF NOT EXISTS idx_expenses_next_occurrence ON expenses(next_occurrence_date) WHERE next_occurrence_date IS NOT NULL;

COMMENT ON COLUMN expenses.is_recurring IS 'Whether this is a recurring expense';
COMMENT ON COLUMN expenses.recurrence_pattern IS 'Pattern: daily, weekly, biweekly, monthly, quarterly, yearly';
COMMENT ON COLUMN expenses.next_occurrence_date IS 'Next date this recurring expense should be created';
COMMENT ON COLUMN expenses.parent_recurring_id IS 'Reference to parent recurring expense if this was auto-generated';
