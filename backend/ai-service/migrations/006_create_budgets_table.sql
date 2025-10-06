-- Migration 006: Create budgets table
-- Date: 2025-10-06
-- Description: Add budget management and tracking

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  monthly_limit DECIMAL(10, 2) NOT NULL CHECK (monthly_limit > 0),
  start_date DATE NOT NULL,
  end_date DATE,
  alert_threshold INTEGER DEFAULT 80 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_email, category, start_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_budgets_user_email ON budgets(user_email);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);
CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_budgets_user_active ON budgets(user_email, is_active) WHERE is_active = TRUE;

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_budgets_updated_at
BEFORE UPDATE ON budgets
FOR EACH ROW
EXECUTE FUNCTION update_budgets_updated_at();

COMMENT ON TABLE budgets IS 'Budget management and tracking by category';
COMMENT ON COLUMN budgets.alert_threshold IS 'Percentage (0-100) at which to alert user';
COMMENT ON COLUMN budgets.is_active IS 'Whether this budget is currently active';
