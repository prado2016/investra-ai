/**
 * Simplified Integration Tests
 * High-level integration tests focusing on key user workflows
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { LoadingProvider } from '../../contexts/LoadingContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import React from 'react';

// Simple test component that combines multiple contexts
const SimpleIntegratedApp = () => {
  const [count, setCount] = React.useState(0);
  
  return (
    <div>
      <h1 data-testid="app-title">Stock Tracker Test</h1>
      <div data-testid="counter">Count: {count}</div>
      <button 
        data-testid="increment-btn"
        onClick={() => setCount(c => c + 1)}
      >
        Increment
      </button>
    </div>
  );
};

// Wrapper component with all providers
const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <LoadingProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
};

describe('Simplified Integration Tests', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' });
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    server.resetHandlers();
    vi.clearAllTimers();
  });

  it('should render app with all providers', () => {
    render(
      <AppWrapper>
        <SimpleIntegratedApp />
      </AppWrapper>
    );

    expect(screen.getByTestId('app-title')).toHaveTextContent('Stock Tracker Test');
    expect(screen.getByTestId('counter')).toHaveTextContent('Count: 0');
    expect(screen.getByTestId('increment-btn')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    render(
      <AppWrapper>
        <SimpleIntegratedApp />
      </AppWrapper>
    );

    const incrementBtn = screen.getByTestId('increment-btn');
    const counter = screen.getByTestId('counter');

    expect(counter).toHaveTextContent('Count: 0');

    fireEvent.click(incrementBtn);
    expect(counter).toHaveTextContent('Count: 1');

    fireEvent.click(incrementBtn);
    expect(counter).toHaveTextContent('Count: 2');
  });

  it('should work with mocked API responses', async () => {
    // Mock a simple API call
    server.use(
      http.get('/api/test', () => {
        return HttpResponse.json({ message: 'Test API response' });
      })
    );

    const TestApiComponent = () => {
      const [data, setData] = React.useState<any>(null);
      const [loading, setLoading] = React.useState(false);

      const fetchData = async () => {
        setLoading(true);
        try {
          const response = await fetch('/api/test');
          const result = await response.json();
          setData(result);
        } catch (error) {
          console.error('API Error:', error);
        } finally {
          setLoading(false);
        }
      };

      return (
        <div>
          <button data-testid="fetch-btn" onClick={fetchData}>
            Fetch Data
          </button>
          {loading && <div data-testid="loading">Loading...</div>}
          {data && <div data-testid="api-data">{data.message}</div>}
        </div>
      );
    };

    render(
      <AppWrapper>
        <TestApiComponent />
      </AppWrapper>
    );

    const fetchBtn = screen.getByTestId('fetch-btn');
    fireEvent.click(fetchBtn);

    // Wait for loading state
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // Wait for API response
    await waitFor(() => {
      expect(screen.getByTestId('api-data')).toHaveTextContent('Test API response');
    });

    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  });

  it('should handle localStorage operations', () => {
    const TestStorageComponent = () => {
      const [value, setValue] = React.useState('');

      const handleSave = () => {
        localStorage.setItem('test-key', 'test-value');
        setValue(localStorage.getItem('test-key') || '');
      };

      const handleLoad = () => {
        setValue(localStorage.getItem('test-key') || '');
      };

      return (
        <div>
          <button data-testid="save-btn" onClick={handleSave}>
            Save to Storage
          </button>
          <button data-testid="load-btn" onClick={handleLoad}>
            Load from Storage
          </button>
          <div data-testid="storage-value">{value}</div>
        </div>
      );
    };

    render(
      <AppWrapper>
        <TestStorageComponent />
      </AppWrapper>
    );

    const saveBtn = screen.getByTestId('save-btn');
    const loadBtn = screen.getByTestId('load-btn');
    const valueDiv = screen.getByTestId('storage-value');

    expect(valueDiv).toHaveTextContent('');

    fireEvent.click(saveBtn);
    expect(valueDiv).toHaveTextContent('test-value');

    // Clear value and reload
    fireEvent.click(loadBtn);
    expect(valueDiv).toHaveTextContent('test-value');
  });

  it('should handle context provider hierarchy', () => {
    let providerCount = 0;

    const TestProviderComponent = () => {
      React.useEffect(() => {
        providerCount++;
      }, []);

      return <div data-testid="provider-test">Provider test component</div>;
    };

    render(
      <AppWrapper>
        <TestProviderComponent />
      </AppWrapper>
    );

    expect(screen.getByTestId('provider-test')).toBeInTheDocument();
    expect(providerCount).toBe(1);
  });
});
