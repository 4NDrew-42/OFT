-- Migration: Create expenses table
-- Date: 2025-10-06

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  expense_date DATE NOT NULL,
  category VARCHAR(100),
  merchant VARCHAR(255),
  description TEXT,
  payment_method VARCHAR(50),
  receipt_image_url TEXT,
  receipt_image_data TEXT,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_email ON expenses(user_email);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expenses_updated_at_trigger
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_expenses_updated_at();
