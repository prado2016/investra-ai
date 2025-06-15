-- Database Schema for Stock Tracker Supabase Integration
-- This file contains the complete database schema for the stock tracker application

-- Enable RLS (Row Level Security) by default
-- This will be implemented in a separate migration

-- =====================================================
-- USERS & PROFILES TABLE
-- =====================================================
-- Note: Supabase automatically creates an auth.users table
-- We create a profiles table for additional user data

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url VARCHAR(500),
  timezone VARCHAR(50) DEFAULT 'UTC',
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PORTFOLIOS TABLE  
-- =====================================================
CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  currency VARCHAR(3) DEFAULT 'USD',
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT portfolios_user_id_name_key UNIQUE(user_id, name)
);

-- =====================================================
-- ASSETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stock', 'option', 'forex', 'crypto', 'reit', 'etf')),
  exchange VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'USD',
  sector VARCHAR(100),
  industry VARCHAR(100),
  
  -- Additional metadata
  market_cap BIGINT,
  shares_outstanding BIGINT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT assets_symbol_key UNIQUE(symbol)
);

-- =====================================================
-- POSITIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES public.assets(id) NOT NULL,
  
  -- Position details
  quantity DECIMAL(20, 8) NOT NULL DEFAULT 0,
  average_cost_basis DECIMAL(15, 4) NOT NULL DEFAULT 0,
  total_cost_basis DECIMAL(15, 2) NOT NULL DEFAULT 0,
  realized_pl DECIMAL(15, 2) DEFAULT 0,
  
  -- Position tracking
  open_date DATE NOT NULL,
  cost_basis_method VARCHAR(20) DEFAULT 'FIFO' CHECK (cost_basis_method IN ('FIFO', 'LIFO', 'AVERAGE_COST', 'SPECIFIC_LOT')),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positions_portfolio_asset_key UNIQUE(portfolio_id, asset_id),
  CONSTRAINT positions_quantity_positive CHECK (quantity >= 0)
);

-- =====================================================
-- TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
  position_id UUID REFERENCES public.positions(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) NOT NULL,
  
  -- Transaction details
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('buy', 'sell', 'dividend', 'split', 'merger', 'transfer', 'option_expired')),
  quantity DECIMAL(20, 8) NOT NULL,
  price DECIMAL(15, 4) NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  fees DECIMAL(10, 2) DEFAULT 0,
  
  -- Transaction metadata
  transaction_date DATE NOT NULL,
  settlement_date DATE,
  exchange_rate DECIMAL(10, 6) DEFAULT 1,
  currency VARCHAR(3) DEFAULT 'USD',
  notes TEXT,
  
  -- External references
  external_id VARCHAR(255), -- For broker integration
  broker_name VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT transactions_quantity_check CHECK (
    (transaction_type IN ('buy', 'dividend') AND quantity > 0) OR
    (transaction_type IN ('sell') AND quantity > 0) OR
    (transaction_type IN ('split', 'merger', 'transfer'))
  )
);

-- =====================================================
-- PRICE DATA TABLE (Optional - for caching)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.price_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  
  -- Price information
  price DECIMAL(15, 4) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  source VARCHAR(50) DEFAULT 'yahoo_finance',
  
  -- Market data
  open_price DECIMAL(15, 4),
  high_price DECIMAL(15, 4),
  low_price DECIMAL(15, 4),
  volume BIGINT,
  
  -- Timestamps
  price_date DATE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT price_data_asset_date_key UNIQUE(asset_id, price_date),
  CONSTRAINT price_data_price_positive CHECK (price > 0)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON public.portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_user_is_active ON public.portfolios(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_positions_portfolio_id ON public.positions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_positions_asset_id ON public.positions(asset_id);
CREATE INDEX IF NOT EXISTS idx_positions_portfolio_active ON public.positions(portfolio_id, is_active);

CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_id ON public.transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_position_id ON public.transactions(position_id);
CREATE INDEX IF NOT EXISTS idx_transactions_asset_id ON public.transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_assets_symbol ON public.assets(symbol);
CREATE INDEX IF NOT EXISTS idx_assets_type ON public.assets(asset_type);

CREATE INDEX IF NOT EXISTS idx_price_data_asset_id ON public.price_data(asset_id);
CREATE INDEX IF NOT EXISTS idx_price_data_date ON public.price_data(price_date);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
