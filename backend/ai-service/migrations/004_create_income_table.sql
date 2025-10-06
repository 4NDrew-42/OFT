-- Migration 004: Create income table for income tracking
-- Date: 2025-10-06
-- Description: Add income tracking with recurring transaction support

CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  income_date DATE NOT NULL,
  source VARCHAR(255),
  category VARCHAR(100),
  description TEXT,
  payment_method VARCHAR(50),
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern VARCHAR(50),
  recurrence_start_date DATE,
  recurrence_end_date DATE,
  next_occurrence_date DATE,
  parent_recurring_id UUID REFERENCES income(id) ON DELETE SET NULL,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_income_user_email ON income(user_email);
CREATE INDEX IF NOT EXISTS idx_income_date ON income(income_date DESC);
CREATE INDEX IF NOT EXISTS idx_income_category ON income(category);
CREATE INDEX IF NOT EXISTS idx_income_recurring ON income(is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX IF NOT EXISTS idx_income_next_occurrence ON income(next_occurrence_date) WHERE next_occurrence_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_income_user_date ON income(user_email, income_date DESC);

-- Full-text search support
CREATE INDEX IF NOT EXISTS idx_income_description_fts ON income USING gin(to_tsvector('english', COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_income_source_fts ON income USING gin(to_tsvector('english', COALESCE(source, '')));

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_income_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_income_updated_at
BEFORE UPDATE ON income
FOR EACH ROW
EXECUTE FUNCTION update_income_updated_at();

COMMENT ON TABLE income IS 'Income tracking with recurring transaction support';
COMMENT ON COLUMN income.is_recurring IS 'Whether this is a recurring income';
COMMENT ON COLUMN income.recurrence_pattern IS 'Pattern: daily, weekly, biweekly, monthly, quarterly, yearly';
COMMENT ON COLUMN income.next_occurrence_date IS 'Next date this recurring income should be created';
COMMENT ON COLUMN income.parent_recurring_id IS 'Reference to parent recurring income if this was auto-generated';
