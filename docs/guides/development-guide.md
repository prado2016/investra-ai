# Investra AI - Comprehensive Development Guide

## Table of Contents

1. [Development Workflow](#development-workflow)
2. [Testing Guide](#testing-guide)
3. [Feature Development](#feature-development)
4. [UI/UX Guidelines](#uiux-guidelines)
5. [Code Examples](#code-examples)
6. [Development Tools](#development-tools)

---

## Development Workflow

### Coding Standards

#### Project Structure
```
src/
├── components/          # Reusable UI components
├── pages/              # Page-level components
├── hooks/              # Custom React hooks
├── services/           # API and business logic
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── contexts/           # React context providers
├── lib/database/       # Database management
└── styles/             # CSS and styling
```

#### Naming Conventions
- **Components**: PascalCase (e.g., `TransactionForm.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useSymbolLookup.ts`)
- **Services**: camelCase (e.g., `apiKeyService.ts`)
- **Types**: PascalCase (e.g., `SymbolLookupRequest`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS`)

#### File Organization
- Co-locate test files with source files using `.test.ts` or `.test.tsx` extensions
- Create index files for clean imports from directories
- Separate concerns: pure functions in utils/, business logic in services/

### Task Management

#### Task Completion Workflow
1. **Analysis**: Understand requirements and dependencies
2. **Planning**: Break down complex tasks into smaller, manageable steps
3. **Implementation**: Follow established patterns and conventions
4. **Testing**: Write unit and integration tests
5. **Documentation**: Update relevant documentation
6. **Review**: Ensure code quality and consistency

#### Dependency Management
- Complete foundational tasks before dependent features
- Database migrations before frontend components
- Service layer before UI integration
- Core components before specialized features

### Feature Development Process

#### Database-First Development
1. **Schema Design**: Create migration scripts first
2. **Type Generation**: Update TypeScript types
3. **Service Layer**: Implement data access services
4. **Frontend Integration**: Build UI components
5. **Testing**: Validate end-to-end functionality

#### Component Development
1. **Interface Design**: Define component props and behavior
2. **Implementation**: Build core functionality
3. **Styling**: Apply consistent design system
4. **Testing**: Unit and integration tests
5. **Documentation**: Usage examples and API docs

---

## Testing Guide

### Testing Stack

- **Vitest** - Fast unit testing framework built for Vite
- **React Testing Library** - Testing utilities for React components
- **jsdom** - DOM implementation for testing
- **MSW (Mock Service Worker)** - API mocking for tests
- **Playwright** - End-to-end testing framework

### Running Tests

#### Unit & Integration Tests
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

#### End-to-End Tests
```bash
# Run e2e tests
npm run test:e2e

# Run e2e tests with UI
npm run test:e2e:ui

# Run e2e tests in headed mode (see browser)
npm run test:e2e:headed
```

#### All Tests
```bash
# Run all tests (unit + e2e)
npm run test:all
```

### Test Structure

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

### Writing Tests

#### Unit Tests
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

#### Component Tests
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

#### API Tests
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

### UAT Testing Process

#### Pre-Testing Setup
1. Configure development environment
2. Start frontend and backend servers
3. Verify database connection
4. Prepare test data

#### Core Functionality Testing
1. **Application Navigation** - Verify all routes work correctly
2. **Dashboard Functionality** - Test summary data display
3. **Transaction Management** - Validate CRUD operations
4. **Email Processing** - Test end-to-end workflow
5. **Settings Configuration** - Verify all settings persist

#### Test Scenarios
- **Happy Path**: Normal user workflows
- **Error Conditions**: Invalid inputs, network failures
- **Edge Cases**: Boundary conditions, unusual data
- **Performance**: Load testing, response times

### Coverage Thresholds
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

---

## Feature Development

### AI Integration

#### Core AI Services Architecture
```
┌─────────────────────────────────┐
│    SymbolLookupEndpointService  │
├─────────────────────────────────┤
│ • Request Validation            │
│ • Rate Limiting                 │
│ • Provider Management          │
│ • Error Handling               │
│ • Logging & Monitoring         │
│ • Cache Integration            │
└─────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│       AI Service Layer          │
├─────────────────────────────────┤
│ • Gemini AI Service            │
│ • OpenAI Service (future)       │
│ • Perplexity Service (future)   │
│ • Response Caching             │
└─────────────────────────────────┘
```

#### AI Symbol Lookup Implementation
```typescript
import { symbolLookupEndpoint } from '@/services';

const response = await symbolLookupEndpoint.lookupSymbol({
  query: 'Apple',
  options: {
    maxSuggestions: 5,
    includeAlternatives: true
  }
});

if (response.success) {
  console.log('Matches:', response.data.matches);
  console.log('Suggestions:', response.data.suggestions);
}
```

#### AI Service Configuration
- **API Key Management**: Encrypted storage with client-side encryption
- **Rate Limiting**: Per-user and per-provider limits
- **Caching**: Multi-level caching with configurable TTL
- **Error Handling**: Retry logic with exponential backoff
- **Monitoring**: Health checks and usage analytics

### Transaction Handling

#### Position Management System
Positions represent current holdings in specific assets within portfolios:

1. **Core Concept**: Track quantity, cost basis, market value, and P&L
2. **Lifecycle Management**: Opening, adding, reducing, and closing positions
3. **Calculations**: Weighted average cost, unrealized P&L, total return
4. **Real-time Updates**: Live price feeds and automatic recalculation

#### Transaction Processing Flow
```
Transaction Entry → Validation → Position Update → P&L Calculation → UI Display
```

#### Key Features
- **Multiple Asset Types**: Stocks, ETFs, options, crypto, REITs
- **Precision Support**: Up to 8 decimal places for crypto/forex
- **Symbol Validation**: Extended format support for complex option symbols
- **Error Handling**: Graceful degradation and user feedback

### Portfolio Management

#### Database Schema Enhancements
- **Extended Symbol Fields**: Support for 100-character symbols
- **High Precision Pricing**: DECIMAL(20,8) for accurate calculations
- **Option Support**: Strike price, expiration, contract size fields
- **Migration System**: Safe schema updates with rollback capability

#### Real-time Features
- **Live Price Updates**: Periodic market data refresh
- **Automatic P&L**: Real-time gain/loss calculations
- **Portfolio Tracking**: Aggregated value monitoring

---

## UI/UX Guidelines

### Brand Guidelines

#### Color Scheme
- **Primary Green**: #2F5233 (dark forest green)
- **Accent Gold**: #FFD700 (golden yellow)
- **Background**: #F5F5DC (beige/cream)
- **Theme Color**: #2F5233

#### Visual Identity
- **Logo Elements**: Golden coin, bar chart, green leaves
- **Typography**: Professional, readable fonts
- **Icons**: Consistent style and sizing
- **Layout**: Card-based design with proper shadows

### Component Design Principles

#### Dark Mode Excellence
- **High Contrast**: 7:1 ratios for critical content
- **Consistent Colors**: CSS custom properties throughout
- **Form Visibility**: Enhanced input field contrast
- **Button Styling**: Improved visibility and accessibility

#### Accessibility Standards
- **ARIA Labels**: Proper semantic markup
- **Touch Targets**: Minimum 44px button sizes
- **Focus States**: Visible keyboard navigation
- **Color Contrast**: WCAG AA compliance

#### Responsive Design
- **Mobile-First**: Progressive enhancement approach
- **Breakpoints**: Consistent responsive behavior
- **Touch-Friendly**: Optimized for mobile interaction
- **Performance**: Optimized loading and rendering

### Modern Financial UI

#### Visual Hierarchy
- **Section Separation**: Icons and proper spacing
- **Card Layout**: Clean, organized content structure
- **Typography**: Tabular figures for financial data
- **Status Indicators**: Color-coded badges and alerts

#### Company Branding
- **Logo Integration**: Fallback system for company logos
- **Multiple Sources**: Clearbit, Logo.dev, Brandfetch
- **Emoji Fallbacks**: Popular companies (AAPL=🍎, MSFT=🪟)
- **Responsive Sizing**: sm/md/lg variants

---

## Code Examples

### AI Symbol Lookup Hook
```tsx
import { useSymbolLookup } from '@/hooks/useSymbolLookup';

function MyComponent() {
  const {
    lookupSymbol,
    isLoading,
    data,
    error,
    rateLimitInfo
  } = useSymbolLookup({
    onSuccess: (response) => {
      console.log('Symbol lookup successful:', response);
    },
    retryOnFailure: true,
    maxRetries: 3
  });

  const handleSearch = async (query: string) => {
    try {
      await lookupSymbol({
        query,
        options: { maxSuggestions: 5 }
      });
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <div>
      {isLoading && <div>Searching...</div>}
      {error && <div>Error: {error.message}</div>}
      {data && (
        <div>
          <h3>Matches:</h3>
          {data.data.matches.map(match => (
            <div key={match.symbol}>
              {match.symbol} - {match.companyName} ({match.confidence * 100}%)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Enhanced Symbol Input Component
```tsx
import SymbolInputWithAI from '@/components/SymbolInputWithAI';

function AddStockForm() {
  const [symbol, setSymbol] = useState('');
  const [isSymbolValid, setIsSymbolValid] = useState(false);

  return (
    <form>
      <label>Stock Symbol:</label>
      <SymbolInputWithAI
        value={symbol}
        onChange={setSymbol}
        onValidSymbol={(symbol, isValid) => setIsSymbolValid(isValid)}
        placeholder="e.g., AAPL"
        required
        showValidation
        validateOnBlur
        autoComplete
      />
      <button type="submit" disabled={!isSymbolValid}>
        Add Stock
      </button>
    </form>
  );
}
```

### Database Migration Example
```sql
-- migrations/002_extend_symbol_field.sql
-- Extend symbol field for complex option symbols
ALTER TABLE transactions 
ALTER COLUMN symbol TYPE VARCHAR(100);

-- Add option-specific fields
ALTER TABLE transactions 
ADD COLUMN underlying_symbol VARCHAR(20),
ADD COLUMN option_type VARCHAR(4) CHECK (option_type IN ('CALL', 'PUT')),
ADD COLUMN strike_price DECIMAL(15,4),
ADD COLUMN expiration_date DATE,
ADD COLUMN contract_size INTEGER DEFAULT 100;

-- Create indexes for performance
CREATE INDEX idx_transactions_underlying_symbol ON transactions(underlying_symbol);
CREATE INDEX idx_transactions_option_expiration ON transactions(expiration_date) 
  WHERE option_type IS NOT NULL;
```

### API Key Management
```typescript
import { apiKeyService } from '@/services/apiKeyService';

// Store encrypted API key
await apiKeyService.saveApiKey({
  provider: 'gemini',
  key: 'your-api-key',
  isActive: true
});

// Retrieve and decrypt API key
const apiKey = await apiKeyService.getApiKey('gemini');

// Test API key validity
const isValid = await apiKeyService.testApiKey('gemini', apiKey);
```

### Mock Data for Testing
```typescript
// mockDashboardData.ts
export const getMockDashboardData = (scenario: string = 'profitable') => {
  const scenarios = {
    profitable: {
      totalDailyPL: 1250.75,
      realizedPL: 3420.50,
      unrealizedPL: -234.25,
      dividendIncome: 127.88,
      tradingFees: 89.94,
      tradeVolume: 45670.25,
      netCashFlow: 15000.00
    },
    // ... other scenarios
  };
  
  return scenarios[scenario] || scenarios.profitable;
};
```

---

## Development Tools

### Debug Tools

#### Symbol Lookup Monitoring
```tsx
import SymbolLookupMonitoring from '@/components/SymbolLookupMonitoring';

function AdminDashboard() {
  return (
    <div className="admin-dashboard">
      <h1>System Monitoring</h1>
      <SymbolLookupMonitoring 
        refreshInterval={30000} // 30 seconds
        className="mt-6"
      />
    </div>
  );
}
```

#### Health Monitoring
```typescript
// Check service health
const health = await symbolLookupEndpoint.getHealth();
console.log('Service health:', health);

// Check usage stats
const stats = await symbolLookupEndpoint.getUsageStats();
console.log('Usage statistics:', stats);
```

#### Error Handling and Debugging
```typescript
// Structured error responses
interface SymbolLookupEndpointError {
  code: 'VALIDATION_ERROR' | 'RATE_LIMIT_EXCEEDED' | 'SERVICE_UNAVAILABLE' | 'AI_SERVICE_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  retryable: boolean;
  details?: {
    userMessage?: string;
    limitType?: 'hourly' | 'daily';
    resetTime?: string;
  };
}
```

### Testing Tools

#### Vitest Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70
      }
    }
  }
})
```

#### Test Utilities
```typescript
// test-utils.tsx
import { render } from '@testing-library/react'
import { ThemeProvider } from '@/contexts/ThemeContext'

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  )
}
```

### Development Setup

#### Environment Variables
```bash
# .env
VITE_USE_MOCK_DASHBOARD=true
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

#### Development Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext ts,tsx",
    "type-check": "tsc --noEmit"
  }
}
```

#### Database Tools
```bash
# Run migrations
npm run migrate:up

# Rollback migrations
npm run migrate:down

# Reset database
npm run migrate:reset

# Seed test data
node scripts/insert-mock-data.mjs
```

### Performance Monitoring

#### Metrics Tracking
```typescript
interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  emailProcessingTime: number;
  databaseQueryTime: number;
}

// Target performance thresholds
const targets = {
  pageLoadTime: 3000,      // < 3 seconds
  apiResponseTime: 1000,   // < 1 second
  emailProcessingTime: 10000, // < 10 seconds
  databaseQueryTime: 500   // < 500ms
};
```

#### Load Testing
- **Concurrent Users**: Test with 5+ simultaneous users
- **Bulk Processing**: Handle 50+ emails simultaneously
- **Large Datasets**: Support 1000+ transactions
- **Extended Usage**: 4+ hour continuous operation

### Troubleshooting

#### Common Issues
1. **AI Provider Unavailable**: Check API key configuration
2. **Rate Limit Exceeded**: Wait for reset or increase limits
3. **Slow Response Times**: Monitor provider performance
4. **Symbol Not Found**: Verify AI training data

#### Debug Commands
```bash
# Check API health
curl http://localhost:3001/health

# Test email processing
curl -X POST http://localhost:3001/api/process-email \
  -H "Content-Type: application/json" \
  -d '{"htmlContent": "test email"}'

# Validate database connection
npm run db:test
```

---

This comprehensive development guide provides a complete reference for working with the Investra AI portfolio tracking application. It covers all aspects from basic development workflow to advanced AI integration, ensuring consistent and high-quality development practices across the entire codebase.