import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navigation from './components/Navigation';
import Breadcrumb from './components/Breadcrumb';
import NotificationContainer from './components/NotificationContainer';
import { OfflineIndicator } from './components/NetworkStatus';
import DebugPanel from './components/DebugPanel';
import AuthComponent from './components/auth/AuthComponent';
import Dashboard from './pages/Dashboard';
import Positions from './pages/Positions';
import Transactions from './pages/Transactions';
import Summary from './pages/Summary';
import Settings from './pages/Settings';
import { debug, ErrorTracker, isDev } from './utils/debug';
import './styles/App.css';

// Modern loading component with improved styling
const LoadingScreen: React.FC = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'var(--bg-primary)',
    fontFamily: 'var(--font-family-base)'
  }}>
    <div className="card" style={{
      textAlign: 'center',
      padding: 'var(--space-8)',
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-lg)',
      border: '1px solid var(--border-primary)',
      minWidth: '300px'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '4px solid var(--color-primary-200)',
        borderTop: '4px solid var(--color-primary-500)',
        borderRadius: '50%',
        margin: '0 auto var(--space-6) auto',
        animation: 'spin 1s linear infinite'
      }} />
      <h2 style={{ 
        margin: '0 0 var(--space-3) 0', 
        color: 'var(--text-primary)',
        fontSize: 'var(--text-xl)',
        fontWeight: 'var(--font-weight-semibold)'
      }}>
        Investra AI
      </h2>
      <p style={{ 
        margin: 0, 
        color: 'var(--text-secondary)',
        fontSize: 'var(--text-sm)'
      }}>
        Initializing AI-powered analytics...
      </p>
    </div>
  </div>
);

// Modern auth screen with improved design
const AuthScreen: React.FC = () => (
  <AuthComponent />
);

// Inner App component that uses auth context
function AppContent() {
  const { user, loading } = useAuth();

  // Initialize theme and app title on app load
  React.useEffect(() => {
    // Set initial theme based on user preference or default to light
    const savedTheme = localStorage.getItem('theme');
    const initialTheme = savedTheme || 'light'; // Default to light theme
    
    document.documentElement.setAttribute('data-theme', initialTheme);
    if (!savedTheme) {
      localStorage.setItem('theme', initialTheme);
    }
    
    // Set default app title if no page-specific title is set
    if (document.title === 'Investra - AI-Powered Investment Analytics') {
      document.title = 'Investra - AI-Powered Investment Analytics';
    }
  }, []);

  // Log app initialization
  React.useEffect(() => {
    debug.info('App initialized', { user: user?.id, loading }, 'App');
  }, [user, loading]);

  if (loading) {
    debug.info('App loading...', undefined, 'App');
    return <LoadingScreen />;
  }

  // Show auth component if user is not logged in
  if (!user) {
    debug.info('User not authenticated, showing auth component', undefined, 'App');
    return <AuthScreen />;
  }

  // Show main app if user is logged in
  debug.info('User authenticated, showing main app', { userId: user.id }, 'App');
  return (
    <Router>
      <div className="App">
        <OfflineIndicator showWhenOnline={true} showConnectionInfo={true} />
        <Navigation />
        <Breadcrumb />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/positions" element={<Positions />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/summary" element={<Summary />} />
            <Route path="/daily-summary" element={<Navigate to="/summary" replace />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <DebugPanel />
      </div>
      <NotificationContainer position="top-right" />
    </Router>
  );
}

function App() {
  // Initialize debug logging for the entire app
  React.useEffect(() => {
    debug.info('🚀 Investra AI App starting...', { 
      isDev, 
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href 
    }, 'App');

    // Enhanced error handling for unhandled errors
    const handleUnhandledError = (event: ErrorEvent) => {
      ErrorTracker.trackError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'unhandled-error'
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      ErrorTracker.trackError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        { type: 'unhandled-rejection', reason: event.reason }
      );
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <AuthProvider>
      <OfflineProvider>
        <RealtimeProvider>
          <ThemeProvider>
            <NotificationProvider maxNotifications={5} defaultDuration={5000}>
              <LoadingProvider>
                <ErrorBoundary 
                  onError={(error, errorInfo) => {
                    // Enhanced error tracking with debug integration
                    debug.error('App Error Boundary caught error', error, 'ErrorBoundary');
                    ErrorTracker.trackError(error, { 
                      errorInfo, 
                      boundary: 'App',
                      timestamp: new Date().toISOString()
                    });
                    
                    // In production, this would send to your error tracking service
                    console.error('App Error Boundary caught error:', error, errorInfo);
                  }}
                >
                  <AppContent />
                </ErrorBoundary>
              </LoadingProvider>
            </NotificationProvider>
          </ThemeProvider>
        </RealtimeProvider>
      </OfflineProvider>
    </AuthProvider>
  );
}

export default App;
