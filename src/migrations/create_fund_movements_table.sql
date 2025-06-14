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
  exchange_fees DECIMAL(5,4), -- Percentage (e.g., 1.5 for 1.5%)
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
CREATE INDEX IF NOT EXISTS idx_fund_movements_created_at ON fund_movements(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_fund_movements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fund_movements_updated_at
  BEFORE UPDATE ON fund_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_fund_movements_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE fund_movements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your auth setup)
-- Allow users to see fund movements for portfolios they own
CREATE POLICY "Users can view their own fund movements" ON fund_movements
  FOR SELECT USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Allow users to insert fund movements for portfolios they own
CREATE POLICY "Users can create fund movements for their portfolios" ON fund_movements
  FOR INSERT WITH CHECK (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Allow users to update fund movements for portfolios they own
CREATE POLICY "Users can update their own fund movements" ON fund_movements
  FOR UPDATE USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Allow users to delete fund movements for portfolios they own
CREATE POLICY "Users can delete their own fund movements" ON fund_movements
  FOR DELETE USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Add some sample data for testing (optional)
-- INSERT INTO fund_movements (
--   portfolio_id, type, status, movement_date, amount, currency,
--   original_amount, original_currency, converted_amount, converted_currency,
--   exchange_rate, exchange_fees, account
-- ) VALUES (
--   'your-portfolio-id-here', 'conversion', 'completed', '2025-04-16',
--   9234.51, 'USD', 13000.00, 'CAD', 9234.51, 'USD', 0.710347, 1.0, 'TFSA'
-- );
