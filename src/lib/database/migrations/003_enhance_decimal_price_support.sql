-- Migration: Enhanced Decimal Price Support
-- Task 1: Update Database Schema for Decimal Price Support
-- Verify and enhance decimal price support for prices like 16.5999
-- Date: 2025-06-06

-- =====================================================
-- VERIFY CURRENT DECIMAL SUPPORT
-- =====================================================
-- Current schema already supports DECIMAL(15, 4) which handles:
-- - Up to 15 total digits
-- - Up to 4 decimal places  
-- - Range: -99999999999.9999 to 99999999999.9999
-- This already supports prices like 16.5999

-- =====================================================
-- ENHANCE PRECISION FOR CRYPTO/FOREX
-- =====================================================
-- For cryptocurrencies and forex, we might need more decimal places
-- Let's add support for higher precision where needed

-- Add high-precision price fields for specific asset types
ALTER TABLE public.price_data 
ADD COLUMN IF NOT EXISTS high_precision_price DECIMAL(20, 8); -- For crypto: 0.00000001

-- Add comment to clarify usage
COMMENT ON COLUMN public.price_data.price IS 'Standard price with 4 decimal places for most assets';
COMMENT ON COLUMN public.price_data.high_precision_price IS 'High precision price with 8 decimal places for crypto/forex';

-- =====================================================
-- ADD PRICE VALIDATION CONSTRAINTS
-- =====================================================
-- Ensure we have proper price validation
ALTER TABLE public.price_data 
ADD CONSTRAINT price_data_high_precision_positive 
CHECK (high_precision_price IS NULL OR high_precision_price > 0);

-- =====================================================
-- UPDATE TRANSACTION PRICE PRECISION
-- =====================================================
-- Ensure transaction prices can handle high precision for crypto
ALTER TABLE public.transactions 
ALTER COLUMN price TYPE DECIMAL(20, 8);

-- Update positions average cost basis for higher precision
ALTER TABLE public.positions 
ALTER COLUMN average_cost_basis TYPE DECIMAL(20, 8);

-- =====================================================
-- ADD INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_price_data_high_precision 
ON public.price_data(asset_id, high_precision_price) 
WHERE high_precision_price IS NOT NULL;
