import { createContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Re-export useAuth and AuthProvider from AuthProvider for convenience
export { useAuth, AuthProvider } from './AuthProvider';
