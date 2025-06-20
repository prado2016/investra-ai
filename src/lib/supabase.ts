import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database/types'
import { registerSupabaseInstance } from '../utils/supabaseInstanceTracker'

// Cross-platform environment variable support
const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env 
  ? import.meta.env.VITE_SUPABASE_URL 
  : process.env.VITE_SUPABASE_URL

const supabaseKey = typeof import.meta !== 'undefined' && import.meta.env 
  ? import.meta.env.VITE_SUPABASE_ANON_KEY 
  : process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

// Singleton instance to prevent multiple GoTrueClient instances
let supabaseInstance: SupabaseClient<Database> | null = null;

// Storage key to prevent conflicts with other apps
const STORAGE_KEY = 'investra-ai-supabase-auth';

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: STORAGE_KEY,
        storage: {
          getItem: (key: string) => {
            try {
              return localStorage.getItem(key);
            } catch {
              return null;
            }
          },
          setItem: (key: string, value: string) => {
            try {
              localStorage.setItem(key, value);
            } catch {
              // Silently fail if localStorage is not available
            }
          },
          removeItem: (key: string) => {
            try {
              localStorage.removeItem(key);
            } catch {
              // Silently fail if localStorage is not available
            }
          }
        }
      },
      global: {
        headers: {
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=30, max=100'
        },
        fetch: (url: RequestInfo | URL, options: RequestInit = {}) => {
          // Add timeout to all Supabase requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
          
          const modifiedOptions = {
            ...options,
            signal: controller.signal
          };
          
          return fetch(url, modifiedOptions).finally(() => {
            clearTimeout(timeoutId);
          });
        }
      },
      db: {
        schema: 'public'
      }
    });
    console.log('🔐 Supabase client initialized (singleton) with storage key:', STORAGE_KEY);
    
    // Register instance for tracking in development
    registerSupabaseInstance('main-singleton', STORAGE_KEY, supabaseUrl);
  }
  return supabaseInstance;
})();

export type { Database }
export * from './database/types'
