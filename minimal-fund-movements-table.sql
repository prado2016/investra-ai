-- Minimal fund_movements table creation (no DROP statements)
-- Copy and paste this into your Supabase SQL Editor

-- Create fund_movements table for tracking deposits, withdrawals, transfers, and conversions
CREATE TABLE IF NOT EXISTS fund_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  
  -- Movement details
  type TEXT NOT NULL CHECK (type IN ('conversion', 'withdraw', 'deposit', 'transfer')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  movement_date DATE NOT NULL,
  
  -- Common fields
  amount DECIMAL(15,6) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  fees DECIMAL(15,6) DEFAULT 0,
  notes TEXT,
  
  -- For conversions
  original_amount DECIMAL(15,6),
  original_currency TEXT,
  converted_amount DECIMAL(15,6),
  converted_currency TEXT,
  exchange_rate DECIMAL(15,8),
  exchange_fees DECIMAL(5,4),
  account TEXT,
  
  -- For transfers, withdrawals, deposits
  from_account TEXT,
  to_account TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fund_movements_portfolio_id ON fund_movements(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_fund_movements_type ON fund_movements(type);
CREATE INDEX IF NOT EXISTS idx_fund_movements_status ON fund_movements(status);
CREATE INDEX IF NOT EXISTS idx_fund_movements_date ON fund_movements(movement_date);

-- Enable RLS (Row Level Security)
ALTER TABLE fund_movements ENABLE ROW LEVEL SECURITY;

-- Verify table was created successfully
SELECT 'fund_movements table created successfully!' as status;
