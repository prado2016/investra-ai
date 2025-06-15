-- Migration: Add Option Expired Transaction Type
-- Date: 2025-06-15
-- Description: Add 'option_expired' to the allowed transaction types in the database constraint

-- Update the CHECK constraint to include option_expired transaction type
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_transaction_type_check 
CHECK (transaction_type IN ('buy', 'sell', 'dividend', 'split', 'merger', 'transfer', 'option_expired'));

-- Record this migration
INSERT INTO public.schema_migrations (
  migration_name, 
  migration_file, 
  schema_version
) VALUES (
  'add_option_expired_transaction_type',
  '005_add_option_expired_transaction_type.sql',
  '1.5.0'
) ON CONFLICT (migration_name) DO NOTHING;
