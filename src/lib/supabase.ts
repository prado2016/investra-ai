import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database/types'
import { registerSupabaseInstance } from '../utils/supabaseInstanceTracker'

// Cross-platform environment variable support with fallback
const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  process.env.VITE_SUPABASE_URL ||
  'https://ecbuwhpipphdssqjwgfm.supabase.co'; // Fallback for production

const supabaseKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E'; // Fallback for production

// Log successful Supabase initialization
console.log('🔐 Supabase configured:', {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
  hasKey: !!supabaseKey,
  source: import.meta?.env?.VITE_SUPABASE_URL ? 'environment' : 'fallback'
});

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration error:', { supabaseUrl, supabaseKey });
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
