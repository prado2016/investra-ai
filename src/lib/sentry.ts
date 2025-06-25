import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

export function initSentry() {
  // Only initialize Sentry if DSN is provided
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('VITE_SENTRY_DSN not found - Sentry will not be initialized');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    
    // Performance monitoring
    integrations: [
      new BrowserTracing({
        // Set tracing sample rate based on environment
        tracePropagationTargets: ['localhost', /^https:\/\/.*\.investra\.ai/],
      }),
    ],
    
    // Sample rates
    tracesSampleRate: isProduction ? 0.1 : 1.0, // Lower sample rate in production
    sampleRate: isProduction ? 0.8 : 1.0, // Capture most errors in production
    
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || 'unknown',
    
    // Debug mode in development
    debug: isDevelopment,
    
    // Capture unhandled promise rejections
    captureUnhandledRejections: true,
    
    // Filter out known noise
    beforeSend(event, hint) {
      // Filter out development-only errors
      if (isDevelopment && event.exception) {
        const error = hint.originalException;
        if (error instanceof Error) {
          // Skip common development errors
          if (error.message.includes('ResizeObserver loop limit exceeded')) {
            return null;
          }
          if (error.message.includes('Non-Error promise rejection captured')) {
            return null;
          }
        }
      }
      
      return event;
    },
    
    // Set user context automatically
    initialScope: {
      tags: {
        component: 'frontend',
        framework: 'react',
        build_tool: 'vite'
      }
    }
  });
}

// Helper function to capture exceptions with context
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

// Helper function to add breadcrumbs
export function addBreadcrumb(message: string, category: string = 'app', level: Sentry.SeverityLevel = 'info', data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data
  });
}

// Helper function to set user context
export function setUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user);
}

// Helper function to clear user context
export function clearUser() {
  Sentry.setUser(null);
}

// Export Sentry for direct usage
export { Sentry };