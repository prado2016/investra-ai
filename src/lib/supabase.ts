import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

// Singleton instance to prevent multiple GoTrueClient instances
let supabaseInstance: SupabaseClient<Database> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseKey);
    console.log('🔐 Supabase client initialized (singleton)');
  }
  return supabaseInstance;
})();

export type { Database }
export * from './database/types'
