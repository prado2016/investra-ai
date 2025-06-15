-- Migration: Fix Option Expired Quantity Constraint
-- Date: 2025-06-15
-- Description: Update the transactions_quantity_check constraint to allow option_expired transactions

-- Drop the existing quantity check constraint
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_quantity_check;

-- Add the updated quantity check constraint that includes option_expired
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_quantity_check 
CHECK (
  (transaction_type IN ('buy', 'dividend') AND quantity > 0) OR
  (transaction_type IN ('sell') AND quantity > 0) OR
  (transaction_type IN ('split', 'merger', 'transfer')) OR
  (transaction_type = 'option_expired' AND quantity > 0)
);

-- Record this migration
INSERT INTO public.schema_migrations (
  migration_name, 
  migration_file, 
  schema_version
) VALUES (
  'fix_option_expired_quantity_constraint',
  '006_fix_option_expired_quantity_constraint.sql',
  '1.5.1'
) ON CONFLICT (migration_name) DO NOTHING;
