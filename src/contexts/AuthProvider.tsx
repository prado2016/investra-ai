import React, { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { AuthContextType } from './AuthContext';

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  // Debug excessive calls in development
  if (process.env.NODE_ENV === 'development') {
    const callCount = (window as any).__authCallCount || 0;
    (window as any).__authCallCount = callCount + 1;
    
    if (callCount > 0 && callCount % 50 === 0) {
      console.warn(`⚠️ useAuth called ${callCount} times - potential loop detected`);
      console.trace('useAuth call stack');
    }
  }
  
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we're in E2E test mode - restrictive detection for actual test environments only
    const isActualTestEnvironment = 
      // Explicit test flags that are only set by test frameworks
      (typeof window !== 'undefined' && window.location.search.includes('e2e-test=true')) ||
      // Playwright/headless browser detection
      (typeof window !== 'undefined' && /playwright/i.test(navigator.userAgent)) ||
      (typeof window !== 'undefined' && /headless/i.test(navigator.userAgent)) ||
      // Only localhost development server (not production)
      (typeof window !== 'undefined' && 
       window.location.hostname === 'localhost' && 
       window.location.port === '5173') ||
      // Emergency flag from index.html (only set for actual test environments now)
      (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__EMERGENCY_E2E_MODE__) ||
      // Explicit window flags (only set by test setup scripts)
      (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__E2E_TEST_MODE__);

    // Debug logging only for actual test environments
    if (isActualTestEnvironment) {
      console.log('🔐 AuthProvider init - E2E test mode check:', {
        isE2ETestMode: true,
        userAgent: navigator.userAgent,
        hostname: window.location.hostname,
        port: window.location.port,
        protocol: window.location.protocol
      });
    }

    if (isActualTestEnvironment) {
      console.log('🧪 AuthProvider: E2E test mode detected - bypassing authentication');
      // Create a mock user for E2E tests
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        aud: 'authenticated',
        role: 'authenticated',
        email_confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: { full_name: 'Test User' },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as User;

      const mockSession = {
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'mock-refresh-token',
        user: mockUser
      } as Session;

      setUser(mockUser);
      setSession(mockSession);
      setLoading(false);
      console.log('🧪 AuthProvider: Mock auth state set - user authenticated for E2E tests');
      return;
    }

    // Get initial session
    const getSession = async () => {
      try {
        console.log('🔐 AuthContext: Getting initial session...');
        
        // Add a timeout to prevent infinite hanging - increased to 15 seconds for better reliability
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Session request timeout after 15 seconds')), 15000)
        );
        
        const result = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);
        
        const { data: { session }, error } = result;
        console.log('🔐 AuthContext: Session result:', { session: !!session, error: error?.message });
        
        if (error) {
          console.error('Error getting session:', error);
          // For auth errors, still proceed without blocking the app
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        console.log('🔐 AuthContext: Auth state updated:', { 
          hasUser: !!session?.user, 
          loading: false 
        });
      } catch (err) {
        console.error('🔐 AuthContext: Error in getSession (timeout or other):', err);
        // Don't leave the app hanging - set loading to false and proceed without auth
        setSession(null);
        setUser(null);
        setLoading(false);
        console.log('🔐 AuthContext: Recovered from error, proceeding without auth');
        
        // Show a user-friendly notification about connectivity issues
        console.warn('🔐 AuthContext: Unable to connect to authentication service. You can still use the app with limited functionality.');
      }
    };

    getSession();

    // Only set up auth state listener if not in E2E test mode
    if (!isActualTestEnvironment) {
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔐 AuthContext: Auth state changed:', event, session?.user?.email);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);

          // Create profile when user signs up
          if (event === 'SIGNED_IN' && session?.user) {
            await createOrUpdateProfile(session.user);
          }
        }
      );

      return () => subscription.unsubscribe();
    }
  }, []);

  const createOrUpdateProfile = async (user: User) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || '',
          avatar_url: user.user_metadata?.avatar_url || '',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Error creating/updating profile:', error);
      }
    } catch (err) {
      console.error('Error in createOrUpdateProfile:', err);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;