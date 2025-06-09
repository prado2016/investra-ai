import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '../contexts/ThemeContext'
import { vi } from 'vitest'

// Mock theme for testing
const mockTheme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#6b7280',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    text: {
      primary: '#1f2937',
      secondary: '#6b7280'
    },
    background: '#ffffff',
    surface: '#f9fafb',
    border: '#e5e7eb'
  },
  fonts: {
    sans: 'Inter, system-ui, sans-serif'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  }
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  wrapper?: React.ComponentType<{ children: React.ReactNode }>
  withRouter?: boolean
  withTheme?: boolean
}

const customRender = (
  ui: React.ReactElement,
  {
    wrapper,
    withRouter = true,
    withTheme = true,
    ...options
  }: CustomRenderOptions = {}
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    let component = children

    // Note: NotificationProvider and LoadingProvider would need to be implemented
    // if (withNotifications) {
    //   component = <NotificationProvider>{component}</NotificationProvider>
    // }

    if (withTheme) {
      component = <ThemeProvider>{component}</ThemeProvider>
    }

    if (withRouter) {
      component = (
        <BrowserRouter 
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          {component}
        </BrowserRouter>
      )
    }

    if (wrapper) {
      const CustomWrapper = wrapper
      component = <CustomWrapper>{component}</CustomWrapper>
    }

    return <>{component}</>
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

// Test utilities for common testing patterns
export const testUtils = {
  // Create mock function with better typing
  createMockFn: <T extends (...args: unknown[]) => unknown>(implementation?: T) => {
    return vi.fn(implementation) as MockedFunction<T>
  },

  // Wait for async operations
  waitFor: async (callback: () => void | Promise<void>, timeout = 1000) => {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      try {
        await callback()
        return
      } catch {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }
    throw new Error(`Timeout after ${timeout}ms`)
  },

  // Create mock localStorage
  mockLocalStorage: () => {
    const store: Record<string, string> = {}
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach(key => delete store[key])
      })
    }
  },

  // Create mock fetch response
  mockFetchResponse: (data: unknown, options: { status?: number; ok?: boolean } = {}) => {
    return {
      ok: options.ok ?? true,
      status: options.status ?? 200,
      json: async () => data,
      text: async () => JSON.stringify(data),
      clone: () => testUtils.mockFetchResponse(data, options)
    }
  },

  // Mock form data
  mockFormData: {
    transaction: {
      assetSymbol: 'AAPL',
      assetType: 'stock',
      type: 'buy',
      quantity: '10',
      price: '150.25',
      totalAmount: '1502.50',
      fees: '9.99',
      currency: 'USD',
      date: '2025-01-15',
      notes: 'Test transaction'
    }
  }
}

// Export everything needed for testing
export * from '@testing-library/react'
export { customRender as render }
export { mockTheme }

// Type helper for mocked functions
type MockedFunction<T extends (...args: unknown[]) => unknown> = ReturnType<typeof vi.fn<T>>

export type { MockedFunction }
