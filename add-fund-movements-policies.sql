-- Add RLS policies for fund_movements table
-- Copy and paste this into your Supabase SQL Editor

-- Create RLS policies for fund_movements table
-- Allow users to see fund movements for portfolios they own
CREATE POLICY "Users can view their own fund movements" ON fund_movements
  FOR SELECT USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE owner_id = auth.uid()
    )
  );

-- Allow users to insert fund movements for portfolios they own
CREATE POLICY "Users can create fund movements for their portfolios" ON fund_movements
  FOR INSERT WITH CHECK (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE owner_id = auth.uid()
    )
  );

-- Allow users to update fund movements for portfolios they own
CREATE POLICY "Users can update their own fund movements" ON fund_movements
  FOR UPDATE USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE owner_id = auth.uid()
    )
  );

-- Allow users to delete fund movements for portfolios they own
CREATE POLICY "Users can delete their own fund movements" ON fund_movements
  FOR DELETE USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE owner_id = auth.uid()
    )
  );

-- Verify policies were created
SELECT 'RLS policies created successfully!' as status;
