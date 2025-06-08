-- Migration: Add API Keys Table for User Settings
-- Task 14: Database Schema for API Key Storage
-- Date: 2025-06-06

-- =====================================================
-- API KEYS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- API Key Details
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('gemini', 'openai', 'perplexity', 'yahoo_finance')),
  key_name VARCHAR(100) NOT NULL, -- User-friendly name for the key
  encrypted_key TEXT NOT NULL, -- Encrypted API key
  
  -- Key Metadata
  is_active BOOLEAN DEFAULT TRUE,
  last_used TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  
  -- Permissions and Limits
  rate_limit_per_day INTEGER DEFAULT 1000,
  rate_limit_per_hour INTEGER DEFAULT 100,
  allowed_features TEXT[] DEFAULT ARRAY['symbol_lookup'], -- Array of allowed features
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiry date
  
  -- Constraints
  CONSTRAINT api_keys_user_provider_name_key UNIQUE(user_id, provider, key_name)
);

-- =====================================================
-- API USAGE TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE NOT NULL,
  
  -- Usage Details
  endpoint VARCHAR(100) NOT NULL,
  request_method VARCHAR(10) DEFAULT 'POST',
  status_code INTEGER,
  response_time_ms INTEGER,
  
  -- Request/Response Size
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  
  -- Metadata
  feature_used VARCHAR(50), -- e.g., 'symbol_lookup', 'price_fetch'
  error_message TEXT,
  
  -- Timestamps
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes will be created separately
  CONSTRAINT api_usage_status_code_check CHECK (status_code >= 100 AND status_code < 600)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_provider ON public.api_keys(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_api_usage_api_key_id ON public.api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON public.api_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_feature ON public.api_usage(feature_used);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================
CREATE TRIGGER update_api_keys_updated_at 
  BEFORE UPDATE ON public.api_keys 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Users can only access their own API keys
CREATE POLICY "Users can manage their own API keys" ON public.api_keys
  FOR ALL
  USING (auth.uid() = user_id);

-- Users can only see usage for their own API keys
CREATE POLICY "Users can view their own API usage" ON public.api_usage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.api_keys 
      WHERE api_keys.id = api_usage.api_key_id 
      AND api_keys.user_id = auth.uid()
    )
  );

-- Only the system can insert usage records
CREATE POLICY "System can insert API usage" ON public.api_usage
  FOR INSERT
  WITH CHECK (true);
