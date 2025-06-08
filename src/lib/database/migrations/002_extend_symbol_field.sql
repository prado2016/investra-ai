-- Migration: Extend Symbol Field Support
-- Task 2: Extend Symbol Field Database Schema  
-- Update database to support longer option symbols like SOXL250530C00016000
-- Date: 2025-06-06

-- =====================================================
-- EXTEND SYMBOL FIELD LENGTH
-- =====================================================
-- Current: VARCHAR(50) -> New: VARCHAR(100) to handle complex option symbols
-- Example: SOXL250530C00016000 (20 chars) - but being safe with 100 chars

ALTER TABLE public.assets 
ALTER COLUMN symbol TYPE VARCHAR(100);

-- =====================================================
-- ADD OPTION-SPECIFIC FIELDS
-- =====================================================
-- Add fields specific to options to better support option symbols
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS underlying_symbol VARCHAR(20),
ADD COLUMN IF NOT EXISTS option_type VARCHAR(10) CHECK (option_type IN ('call', 'put', NULL)),
ADD COLUMN IF NOT EXISTS strike_price DECIMAL(15, 4),
ADD COLUMN IF NOT EXISTS expiration_date DATE,
ADD COLUMN IF NOT EXISTS contract_size INTEGER DEFAULT 100;

-- =====================================================
-- UPDATE INDEXES
-- =====================================================
-- Drop and recreate symbol index with new length
DROP INDEX IF EXISTS idx_assets_symbol;
CREATE INDEX idx_assets_symbol ON public.assets(symbol);

-- Add index for underlying symbol lookups
CREATE INDEX IF NOT EXISTS idx_assets_underlying_symbol ON public.assets(underlying_symbol);
CREATE INDEX IF NOT EXISTS idx_assets_option_type ON public.assets(asset_type, option_type);
CREATE INDEX IF NOT EXISTS idx_assets_expiration ON public.assets(expiration_date) WHERE asset_type = 'option';
