/**
 * Modern Financial Authentication Component - Premium Design 2024-2025
 * Featuring glassmorphism, animated backgrounds, and premium UI elements
 */
import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, TrendingUp, BarChart3, DollarSign, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AuthComponentProps {
  className?: string;
}

export const AuthComponent: React.FC<AuthComponentProps> = ({ className }) => {
  const { user, signIn, signUp, signOut, loading } = useAuth();
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
    } catch (err) {
      setMessage('An unexpected error occurred');
    }

    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    const result = await signOut();
    if (result.success) {
      setMessage('Signed out successfully!');
    } else {
      setMessage(result.error || 'Sign out failed');
    }
    setAuthLoading(false);
  };

  if (loading) {
    return (
      <div className="auth-loading-container">
        <div className="auth-loading-card glass">
          <div className="loading-spinner-large"></div>
          <h3>Initializing Authentication...</h3>
          <p>Securing your financial data</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="auth-success-container">
        <div className="auth-success-card glass">
          <div className="success-header">
            <div className="success-icon">
              <CheckCircle size={48} />
            </div>
            <h2>Welcome Back!</h2>
            <p>Ready to track your portfolio performance</p>
          </div>
          
          <div className="user-info-grid">
            <div className="user-info-item">
              <Mail size={16} />
              <span>{user.email}</span>
            </div>
            <div className="user-info-item">
              <div className={`verification-badge ${user.email_confirmed_at ? 'verified' : 'pending'}`}>
                {user.email_confirmed_at ? 'Verified' : 'Pending'}
              </div>
            </div>
          </div>

          <div className="dashboard-preview">
            <div className="preview-stats">
              <div className="preview-stat">
                <TrendingUp size={20} />
                <span>Portfolio</span>
              </div>
              <div className="preview-stat">
                <BarChart3 size={20} />
                <span>Analytics</span>
              </div>
              <div className="preview-stat">
                <DollarSign size={20} />
                <span>Tracking</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={authLoading}
            className="btn btn-outline auth-signout-btn"
          >
            {authLoading ? (
              <>
                <Loader size={16} className="loading-spinner" />
                Signing out...
              </>
            ) : (
              'Sign Out'
            )}
          </button>

          {message && (
            <div className={`auth-message ${message.includes('success') ? 'success' : 'error'}`}>
              {message.includes('success') ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`auth-container ${className || ''}`}>
      {/* Animated Background */}
      <div className="auth-background">
        <div className="finora-background">
          <img src="/investra-background.svg" alt="" className="finora-bg-image" />
        </div>
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
        </div>
        <div className="gradient-overlay"></div>
      </div>

      {/* Main Auth Card */}
      <div className="auth-main-card glass">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="finora-logo-container">
              <img src="/investra-logo.svg" alt="Investra" className="finora-logo" />
            </div>
          </div>
          <p className="auth-subtitle">
            Professional portfolio management and analytics
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="auth-mode-toggle">
          <button
            onClick={() => setMode('signin')}
            className={`mode-btn ${mode === 'signin' ? 'active' : ''}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`mode-btn ${mode === 'signup' ? 'active' : ''}`}
          >
            Create Account
          </button>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="fullName" className="form-label">
                Full Name
              </label>
              <div className="input-wrapper">
                <User size={20} className="input-icon" />
                <input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <div className="input-wrapper">
              <Mail size={20} className="input-icon" />
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="input-wrapper">
              <Lock size={20} className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="auth-submit-btn btn btn-primary"
          >
            {authLoading ? (
              <>
                <Loader size={20} className="loading-spinner" />
                {mode === 'signup' ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              <>
                {mode === 'signup' ? 'Create Account' : 'Sign In'}
                <TrendingUp size={20} />
              </>
            )}
          </button>
        </form>

        {message && (
          <div className={`auth-message ${message.includes('success') ? 'success' : 'error'}`}>
            {message.includes('success') ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {message}
          </div>
        )}

        {/* Features Preview */}
        <div className="auth-features">
          <h3>What you'll get:</h3>
          <div className="features-grid">
            <div className="feature-item">
              <BarChart3 size={24} />
              <span>Real-time Analytics</span>
            </div>
            <div className="feature-item">
              <TrendingUp size={24} />
              <span>Portfolio Tracking</span>
            </div>
            <div className="feature-item">
              <DollarSign size={24} />
              <span>P&L Insights</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthComponent;
