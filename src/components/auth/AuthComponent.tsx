/**
 * Simple Authentication Component - Clean Login/Register
 */
import React, { useState } from 'react';
import { Eye, EyeOff, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';

interface AuthComponentProps {
  className?: string;
}

export const AuthComponent: React.FC<AuthComponentProps> = () => {
  const { signIn, signUp, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setMessage('');

    try {
      if (mode === 'signup') {
        const result = await signUp(email, password, fullName);
        if (result.success) {
          setMessage('Account created! Check your email to verify your account.');
        } else {
          setMessage(result.error || 'Signup failed');
        }
      } else {
        const result = await signIn(email, password);
        if (result.success) {
          setMessage('Signed in successfully!');
        } else {
          setMessage(result.error || 'Sign in failed');
        }
      }
    } catch {
      setMessage('An unexpected error occurred');
    }

    setAuthLoading(false);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--bg-primary)'
      }}>
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-8)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-primary)',
          minWidth: '300px'
        }}>
          <div className="spinner-investra" style={{ margin: '0 auto var(--space-4) auto' }}></div>
          <h3 style={{ color: 'var(--text-primary)', margin: '0 0 var(--space-2) 0' }}>
            Loading...
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Initializing Investra AI
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: 'var(--space-4)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '450px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-primary)',
        padding: 'var(--space-8)',
        margin: '0 auto'
      }}>
        {/* Logo and Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: 'var(--space-8)'
        }}>
          <img 
            src="/investra-logo.svg" 
            alt="Investra AI" 
            style={{
              width: '320px',
              height: '96px',
              marginBottom: 'var(--space-4)',
              maxWidth: '100%',
              display: 'block',
              margin: '0 auto var(--space-4) auto'
            }}
          />
        </div>

        {/* Mode Toggle */}
        <div style={{
          display: 'flex',
          marginBottom: 'var(--space-6)',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-1)'
        }}>
          <button
            type="button"
            onClick={() => setMode('signin')}
            style={{
              flex: 1,
              padding: 'var(--space-2) var(--space-4)',
              background: mode === 'signin' ? 'var(--color-primary-500)' : 'transparent',
              color: mode === 'signin' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            style={{
              flex: 1,
              padding: 'var(--space-2) var(--space-4)',
              background: mode === 'signup' ? 'var(--color-primary-500)' : 'transparent',
              color: mode === 'signup' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{
                display: 'block',
                marginBottom: 'var(--space-2)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-investra"
                required
              />
            </div>
          )}

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{
              display: 'block',
              marginBottom: 'var(--space-2)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)'
            }}>
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-investra"
              required
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: 'var(--space-6)' }}>
            <label style={{
              display: 'block',
              marginBottom: 'var(--space-2)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-investra"
                style={{ paddingRight: '3rem' }}
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 'var(--space-3)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary-600)',
                  cursor: 'pointer',
                  padding: 'var(--space-1)',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all var(--transition-fast)'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="btn-investra btn-primary"
            style={{ width: '100%', marginBottom: 'var(--space-4)' }}
          >
            {authLoading ? (
              <>
                <Loader size={18} style={{ marginRight: 'var(--space-2)', animation: 'spin 1s linear infinite' }} />
                {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              mode === 'signin' ? 'Sign In' : 'Create Account'
            )}
          </button>

          {message && (
            <div style={{
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              background: message.includes('success') || message.includes('created') 
                ? 'var(--color-success-50)' 
                : 'var(--color-warning-50)',
              color: message.includes('success') || message.includes('created')
                ? 'var(--color-success-700)'
                : 'var(--color-warning-700)',
              border: `1px solid ${message.includes('success') || message.includes('created')
                ? 'var(--color-success-200)'
                : 'var(--color-warning-200)'}`
            }}>
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthComponent;
