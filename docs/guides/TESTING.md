# Testing Guide

This project uses a comprehensive testing setup with multiple types of tests to ensure code quality and reliability.

## Testing Stack

- **Vitest** - Fast unit testing framework built for Vite
- **React Testing Library** - Testing utilities for React components
- **jsdom** - DOM implementation for testing
- **MSW (Mock Service Worker)** - API mocking for tests
- **Playwright** - End-to-end testing framework

## Running Tests

### Unit & Integration Tests

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### End-to-End Tests

```bash
# Run e2e tests
npm run test:e2e

# Run e2e tests with UI
npm run test:e2e:ui

# Run e2e tests in headed mode (see browser)
npm run test:e2e:headed
```

### All Tests

```bash
# Run all tests (unit + e2e)
npm run test:all
```

## Test Structure

```
src/test/
├── setup.ts              # Test setup and global mocks
├── test-utils.tsx         # Custom render functions and utilities
├── mocks/
│   ├── server.ts         # MSW server setup
│   ├── handlers.ts       # API mock handlers
│   └── data.ts           # Mock data
└── e2e/
    └── app.spec.ts       # End-to-end tests
```

## Writing Tests

### Unit Tests

Create test files alongside your source files with `.test.ts` or `.test.tsx` extensions:

```typescript
// utils/formatters.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency } from './formatters'

describe('formatCurrency', () => {
  it('should format USD currency correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })
})
```

### Component Tests

Use the custom render function from test-utils:

```typescript
// components/Button.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/test-utils'
import { Button } from './Button'

describe('Button', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })
})
```

### API Tests

MSW will automatically mock API calls. Use the mock data:

```typescript
// hooks/useYahooFinance.test.ts
import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '../test/test-utils'
import { useQuote } from './useYahooFinance'

describe('useQuote', () => {
  it('should fetch quote data', async () => {
    const { result } = renderHook(() => useQuote('AAPL'))
    
    await waitFor(() => {
      expect(result.current.data).toBeTruthy()
      expect(result.current.data?.symbol).toBe('AAPL')
    })
  })
})
```

### E2E Tests

Use Playwright for full application testing:

```typescript
// src/test/e2e/transactions.spec.ts
import { test, expect } from '@playwright/test'

test('should add a new transaction', async ({ page }) => {
  await page.goto('/transactions')
  await page.click('text=Add Transaction')
  await page.fill('[placeholder="Symbol"]', 'AAPL')
  await page.fill('[placeholder="Quantity"]', '10')
  await page.click('text=Save')
  await expect(page.locator('text=AAPL')).toBeVisible()
})
```

## Coverage Thresholds

The project maintains minimum coverage thresholds:

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Best Practices

1. **Test Behavior, Not Implementation** - Focus on what the component does, not how it does it
2. **Use Descriptive Test Names** - Test names should explain what is being tested
3. **Arrange, Act, Assert** - Structure tests clearly with setup, action, and verification
4. **Mock External Dependencies** - Use MSW for API calls and mock other external services
5. **Test Error Cases** - Don't just test the happy path
6. **Keep Tests Fast** - Unit tests should run quickly, use e2e tests sparingly

## Debugging Tests

### Vitest UI
Run `npm run test:ui` to open the Vitest UI for debugging unit tests.

### Playwright Debug
Run `npm run test:e2e:headed` to see tests running in the browser.

### VS Code Integration
Install the Vitest and Playwright extensions for VS Code to run tests directly in your editor.
