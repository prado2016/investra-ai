/**
 * Test Wrapper with Providers
 * Provides React context providers for testing hooks and components
 */

import React from 'react';
import { render } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';

// Mock notification context
export const mockNotificationContext = {
  notifications: [],
  addNotification: vi.fn(),
  removeNotification: vi.fn(),
  clearNotifications: vi.fn(),
};

// Mock theme context
export const mockThemeContext = {
  isDark: false,
  toggleTheme: vi.fn(),
  theme: 'light' as const,
};

// Create real React contexts for testing
const NotificationContext = React.createContext(mockNotificationContext);
const ThemeContext = React.createContext(mockThemeContext);

// Real provider components that provide the mocked context values
const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <NotificationContext.Provider value={mockNotificationContext}>
      {children}
    </NotificationContext.Provider>
  );
};

const StorageProvider = ({ children }: { children: React.ReactNode }) => {
  return React.createElement('div', { 'data-testid': 'storage-provider' }, children);
};

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeContext.Provider value={mockThemeContext}>
      {children}
    </ThemeContext.Provider>
  );
};

// Complete test wrapper with all providers
const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <StorageProvider>
          {children}
        </StorageProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};

// Custom render function for components
export const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  return render(ui, { wrapper: AllProviders, ...options });
};

// Custom renderHook function for hooks
export const renderHookWithProviders = <T,>(hook: () => T, options = {}) => {
  return renderHook(hook, { wrapper: AllProviders, ...options });
};

// Individual provider wrappers for specific testing scenarios
export const NotificationWrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

export const StorageWrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationProvider>
    <StorageProvider>{children}</StorageProvider>
  </NotificationProvider>
);

export const ThemeWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

// Setup context mocks
export const setupContextMocks = () => {
  // Mock useNotifications hook
  vi.mock('../../hooks/useNotifications', () => ({
    default: () => mockNotificationContext,
    useNotifications: () => mockNotificationContext,
  }));

  // Mock useNotify hook
  vi.mock('../../hooks/useNotify', () => ({
    default: () => mockNotificationContext.addNotification,
  }));

  // Mock useTheme hook
  vi.mock('../../contexts/ThemeContext', () => ({
    useTheme: () => mockThemeContext,
    ThemeProvider,
  }));

  // Mock other context providers
  vi.mock('../../contexts/NotificationContext', () => ({
    NotificationProvider,
    useNotifications: () => mockNotificationContext,
    NotificationContext,
  }));

  vi.mock('../../contexts/StorageContext', () => ({
    StorageProvider,
  }));
};

// Export contexts for direct use in tests
export { NotificationContext, ThemeContext };

// Export all testing utilities
export * from '@testing-library/react';
export { renderWithProviders as render, renderHookWithProviders as renderHook };
