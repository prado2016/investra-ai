// Database types for Supabase integration

export type AssetType = 'stock' | 'option' | 'forex' | 'crypto' | 'reit' | 'etf'
export type TransactionType = 'buy' | 'sell' | 'dividend' | 'split' | 'merger' | 'transfer'
export type CostBasisMethod = 'FIFO' | 'LIFO' | 'AVERAGE_COST' | 'SPECIFIC_LOT'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  timezone: string
  currency: string
  created_at: string
  updated_at: string
}

export interface Portfolio {
  id: string
  user_id: string
  name: string
  description: string | null
  currency: string
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  symbol: string
  name: string | null
  asset_type: AssetType
  exchange: string | null
  currency: string
  sector: string | null
  industry: string | null
  market_cap: number | null
  shares_outstanding: number | null
  last_updated: string
  created_at: string
}

export interface Position {
  id: string
  portfolio_id: string
  asset_id: string
  quantity: number
  average_cost_basis: number
  total_cost_basis: number
  realized_pl: number
  open_date: string
  cost_basis_method: CostBasisMethod
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  portfolio_id: string
  position_id: string | null
  asset_id: string
  transaction_type: TransactionType
  quantity: number
  price: number
  total_amount: number
  fees: number
  transaction_date: string
  settlement_date: string | null
  exchange_rate: number
  currency: string
  notes: string | null
  external_id: string | null
  broker_name: string | null
  created_at: string
  updated_at: string
}

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>>
      }
      portfolios: {
        Row: Portfolio
        Insert: Omit<Portfolio, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Portfolio, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
      assets: {
        Row: Asset
        Insert: Omit<Asset, 'id' | 'created_at'>
        Update: Partial<Omit<Asset, 'id' | 'created_at'>>
      }
      positions: {
        Row: Position
        Insert: Omit<Position, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Position, 'id' | 'created_at' | 'updated_at'>>
      }
      transactions: {
        Row: Transaction
        Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Transaction, 'id' | 'created_at' | 'updated_at'>>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      asset_type: AssetType
      transaction_type: TransactionType
      cost_basis_method: CostBasisMethod
    }
  }
}
