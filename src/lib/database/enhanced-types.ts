// Extended Database types for new schema additions
// Tasks 1, 2, 14: API Keys, Extended Symbols, Enhanced Decimal Support

import type { Asset } from './types';

export type ApiProvider = 'gemini' | 'openai' | 'perplexity' | 'yahoo_finance'

export interface ApiKey {
  id: string
  user_id: string
  provider: ApiProvider
  key_name: string
  encrypted_key: string
  is_active: boolean
  last_used: string | null
  usage_count: number
  rate_limit_per_day: number
  rate_limit_per_hour: number
  allowed_features: string[]
  created_at: string
  updated_at: string
  expires_at: string | null
}

export interface ApiUsage {
  id: string
  api_key_id: string
  endpoint: string
  request_method: string
  status_code: number | null
  response_time_ms: number | null
  request_size_bytes: number | null
  response_size_bytes: number | null
  feature_used: string | null
  error_message: string | null
  timestamp: string
}

export interface SchemaMigration {
  id: number
  migration_name: string
  migration_file: string
  executed_at: string
  execution_time_ms: number | null
  success: boolean
  error_message: string | null
  schema_version: string | null
}

export interface SchemaVersion {
  id: number
  version: string
  updated_at: string
}

// Enhanced Asset interface with option support  
export interface EnhancedAsset extends Asset {
  underlying_symbol?: string | null
  option_type?: 'call' | 'put' | null
  strike_price?: number | null
  expiration_date?: string | null
  contract_size?: number | null
}

// Enhanced Price Data with high precision support
export interface EnhancedPriceData {
  id: string
  asset_id: string
  price: number
  high_precision_price?: number | null
  currency: string
  source: string
  open_price?: number | null
  high_price?: number | null
  low_price?: number | null
  volume?: number | null
  price_date: string
  timestamp: string
  created_at: string
}
