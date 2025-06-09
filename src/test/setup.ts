import '@testing-library/jest-dom'
import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

// Extend Vitest's expect with jest-dom matchers
expect.extend({})

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
  // Clear stored data but keep the mock functionality
  localStorageMock.clear()
  sessionStorageMock.clear()
})

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Close server after all tests
afterAll(() => server.close())

// Reset handlers after each test `important for test isolation`
afterEach(() => server.resetHandlers())

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
})

// Mock localStorage with proper reset functionality
const createStorageMock = () => {
  let storage: Record<string, string> = {};
  return {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => {
      storage[key] = String(value); // Ensure it's a string
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      storage = {};
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: (index: number) => Object.keys(storage)[index] || null,
    _getStorage: () => storage // For debugging
  };
};

const localStorageMock = createStorageMock();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
});

// Also set on global for Node.js environments
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
});

// Mock sessionStorage
const sessionStorageMock = createStorageMock();
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true
});

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true
});

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = vi.fn()
}

// Add helpful global test utilities
declare global {
  let testUtils: {
    mockLocalStorage: typeof localStorageMock
    mockSessionStorage: typeof sessionStorageMock
  }
}

global.testUtils = {
  mockLocalStorage: localStorageMock,
  mockSessionStorage: sessionStorageMock,
}
