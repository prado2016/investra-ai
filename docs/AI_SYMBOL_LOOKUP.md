# AI Symbol Lookup System Documentation

## Overview

The AI Symbol Lookup System provides intelligent stock symbol validation, lookup, and suggestion capabilities using AI services. It's designed as an enterprise-grade endpoint service with comprehensive error handling, rate limiting, monitoring, and caching.

## Architecture

### Core Components

1. **SymbolLookupEndpointService** - Main service class that provides endpoint-like functionality
2. **React Hooks** - `useSymbolLookup` and `useSymbolValidation` for easy integration
3. **UI Components** - `SymbolLookupComponent` and `SymbolInputWithAI` for user interfaces
4. **Monitoring Dashboard** - `SymbolLookupMonitoring` for admin monitoring

### Service Layer Architecture

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

## API Reference

### SymbolLookupEndpointService

#### `lookupSymbol(request: SymbolLookupEndpointRequest): Promise<SymbolLookupEndpointResponse>`

Performs intelligent symbol lookup with AI-powered suggestions.

**Parameters:**
- `request.query` (string) - Symbol or company name to search for
- `request.options.maxSuggestions` (number) - Maximum number of suggestions (1-100)
- `request.options.includeAlternatives` (boolean) - Include alternative suggestions
- `request.userId` (string, optional) - User ID for rate limiting

**Response:**
```typescript
interface SymbolLookupEndpointResponse {
  success: boolean;
  data: {
    matches: SymbolMatch[];
    suggestions: SymbolSuggestion[];
  };
  metadata: {
    requestId: string;
    timestamp: string;
    processingTime: number;
    provider: string;
    rateLimitRemaining: number;
    rateLimitReset: string;
    cached: boolean;
    dailyLimitReached?: boolean;
    hourlyLimitReached?: boolean;
  };
}
```

**Example:**
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

#### `getHealth(): Promise<HealthStatus>`

Returns service health status and provider availability.

**Response:**
```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  averageResponseTime: number;
  providers: {
    name: string;
    available: boolean;
    responseTime: number;
  }[];
}
```

#### `getUsageStats(): Promise<UsageStats>`

Returns usage statistics and metrics.

**Response:**
```typescript
interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  errorCount: number;
  averageResponseTime: number;
  hourlyRequests: number;
  dailyRequests: number;
  hourlyLimit: number;
  dailyLimit: number;
  rateLimitResetTime?: string;
  recentErrors: ErrorLog[];
}
```

## React Hooks

### `useSymbolLookup(options?)`

Comprehensive hook for symbol lookup with retry logic and state management.

**Options:**
```typescript
interface UseSymbolLookupOptions {
  onSuccess?: (data: SymbolLookupEndpointResponse) => void;
  onError?: (error: SymbolLookupEndpointError) => void;
  retryOnFailure?: boolean;
  maxRetries?: number;
}
```

**Returns:**
```typescript
{
  // State
  isLoading: boolean;
  error: SymbolLookupEndpointError | null;
  data: SymbolLookupEndpointResponse | null;
  rateLimitInfo: RateLimitInfo | null;
  
  // Actions
  lookupSymbol: (request: SymbolLookupEndpointRequest) => Promise<SymbolLookupEndpointResponse | null>;
  clearError: () => void;
  clearData: () => void;
  cancel: () => void;
  
  // Utilities
  checkHealth: () => Promise<HealthStatus | null>;
  getUsageStats: () => Promise<UsageStats | null>;
  
  // Computed
  canRetry: boolean;
  retryCount: number;
  isRateLimited: boolean;
}
```

**Example:**
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

### `useSymbolValidation()`

Simplified hook for symbol validation and suggestions.

**Returns:**
```typescript
{
  validateSymbol: (symbol: string) => Promise<boolean>;
  getSuggestions: (query: string) => Promise<string[]>;
  isLoading: boolean;
  error: SymbolLookupEndpointError | null;
}
```

**Example:**
```tsx
import { useSymbolValidation } from '@/hooks/useSymbolLookup';

function SymbolValidator() {
  const { validateSymbol, getSuggestions, isLoading } = useSymbolValidation();
  const [symbol, setSymbol] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const handleValidate = async () => {
    const valid = await validateSymbol(symbol);
    setIsValid(valid);
    
    if (!valid) {
      const suggestions = await getSuggestions(symbol);
      console.log('Suggestions:', suggestions);
    }
  };

  return (
    <div>
      <input 
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        placeholder="Enter symbol"
      />
      <button onClick={handleValidate} disabled={isLoading}>
        Validate
      </button>
      {isValid !== null && (
        <div>{isValid ? '✓ Valid' : '✗ Invalid'}</div>
      )}
    </div>
  );
}
```

## UI Components

### `SymbolLookupComponent`

Full-featured symbol lookup with dropdown results and keyboard navigation.

**Props:**
```typescript
interface SymbolLookupComponentProps {
  onSymbolSelect?: (symbol: string, match: SymbolMatch) => void;
  placeholder?: string;
  className?: string;
  showSuggestions?: boolean;
  showValidation?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}
```

**Features:**
- Real-time search with debouncing
- Dropdown results with exact matches and suggestions
- Keyboard navigation (arrow keys, enter, escape)
- Confidence indicators with color coding
- Error handling with retry buttons
- Rate limit warnings
- Response metadata display

**Example:**
```tsx
import SymbolLookupComponent from '@/components/SymbolLookupComponent';

function SearchPage() {
  const handleSymbolSelect = (symbol: string, match: SymbolMatch) => {
    console.log(`Selected: ${symbol} - ${match.companyName}`);
    // Navigate to symbol details or add to portfolio
  };

  return (
    <SymbolLookupComponent
      onSymbolSelect={handleSymbolSelect}
      placeholder="Search for stocks (e.g., AAPL, Apple Inc.)..."
      showSuggestions={true}
      className="w-full max-w-lg"
    />
  );
}
```

### `SymbolInputWithAI`

Form input component with AI-powered validation and auto-complete.

**Props:**
```typescript
interface SymbolInputWithAIProps {
  value: string;
  onChange: (value: string) => void;
  onValidSymbol?: (symbol: string, isValid: boolean) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  showValidation?: boolean;
  validateOnBlur?: boolean;
  autoComplete?: boolean;
}
```

**Features:**
- Automatic uppercase conversion
- Real-time validation with visual indicators
- Auto-complete suggestions for invalid symbols
- Form integration with validation states
- Accessibility support

**Example:**
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

### `SymbolLookupMonitoring`

Admin dashboard for monitoring symbol lookup usage and health.

**Props:**
```typescript
interface MonitoringDashboardProps {
  className?: string;
  refreshInterval?: number; // in milliseconds
}
```

**Features:**
- Real-time service health monitoring
- Provider availability status
- Usage statistics and rate limiting
- Recent error logs
- Auto-refresh with configurable interval

**Example:**
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

## Error Handling

### Error Types

The system uses structured error responses with specific error codes:

```typescript
interface SymbolLookupEndpointError {
  code: 'VALIDATION_ERROR' | 'RATE_LIMIT_EXCEEDED' | 'SERVICE_UNAVAILABLE' | 'AI_SERVICE_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  retryable: boolean;
  details?: {
    userMessage?: string;
    limitType?: 'hourly' | 'daily';
    resetTime?: string;
    [key: string]: any;
  };
}
```

### Error Codes

- **VALIDATION_ERROR**: Invalid request parameters (not retryable)
- **RATE_LIMIT_EXCEEDED**: Rate limit reached (retryable after reset)
- **SERVICE_UNAVAILABLE**: No AI providers available (retryable)
- **AI_SERVICE_ERROR**: AI service error (retryable)
- **UNKNOWN_ERROR**: Unexpected error (retryable)

### Retry Logic

The system supports automatic retry for retryable errors with exponential backoff:

```typescript
const { lookupSymbol } = useSymbolLookup({
  retryOnFailure: true,
  maxRetries: 3
});
```

## Rate Limiting

### Default Limits

- **Hourly Limit**: 1000 requests per hour
- **Daily Limit**: 10000 requests per day

### Per-User Tracking

Rate limiting is tracked per user (defaults to 'default' if no userId provided):

```typescript
await symbolLookupEndpoint.lookupSymbol({
  query: 'AAPL',
  options: { maxSuggestions: 5 },
  userId: 'user123' // Optional user-specific tracking
});
```

### Rate Limit Headers

All responses include rate limit information:

```typescript
{
  metadata: {
    rateLimitRemaining: 999,
    rateLimitReset: "2025-06-06T16:00:00.000Z",
    hourlyLimitReached: false,
    dailyLimitReached: false
  }
}
```

## Monitoring and Analytics

### Health Monitoring

Monitor service health and provider availability:

```typescript
const health = await symbolLookupEndpoint.getHealth();
console.log('Service status:', health.status);
console.log('Provider availability:', health.providers);
```

### Usage Analytics

Track usage patterns and performance:

```typescript
const stats = await symbolLookupEndpoint.getUsageStats();
console.log('Success rate:', (stats.successfulRequests / stats.totalRequests) * 100);
console.log('Average response time:', stats.averageResponseTime);
```

### Request Logging

All requests are logged with metadata for debugging and analytics:

```typescript
{
  requestId: "req_1234567890",
  timestamp: "2025-06-06T15:30:00.000Z",
  query: "AAPL",
  success: true,
  processingTime: 250,
  provider: "gemini",
  userId: "user123"
}
```

## Configuration

### Service Configuration

The service can be configured through the constructor:

```typescript
const customService = new SymbolLookupEndpointService({
  rateLimitConfig: {
    hourlyLimit: 500,
    dailyLimit: 5000
  },
  maxLogEntries: 1000,
  logCleanupInterval: 300000 // 5 minutes
});
```

### AI Provider Configuration

Configure AI providers through the AI service layer:

```typescript
import { aiServiceManager } from '@/services/ai';

// Provider availability is automatically managed
// Configure API keys through ApiKeyService
```

## Best Practices

### Performance Optimization

1. **Use Debouncing**: Implement input debouncing to avoid excessive API calls
2. **Cache Results**: Leverage built-in caching for repeated queries
3. **Batch Requests**: Group multiple symbol validations when possible

### Error Handling

1. **Graceful Degradation**: Always provide fallback behavior for service failures
2. **User-Friendly Messages**: Use `error.details.userMessage` for UI display
3. **Retry Strategy**: Implement exponential backoff for retryable errors

### Rate Limiting

1. **Monitor Usage**: Track rate limit headers to avoid hitting limits
2. **User Education**: Inform users about rate limits and reset times
3. **Caching**: Use cached results to reduce API usage

### Security

1. **Input Validation**: Always validate and sanitize user inputs
2. **Rate Limiting**: Respect rate limits to prevent abuse
3. **Error Information**: Don't expose sensitive system details in error messages

## Testing

### Unit Tests

Run comprehensive unit tests:

```bash
npm test src/test/symbolLookupEndpoint.test.ts
npm test src/test/useSymbolLookup.test.ts
```

### Integration Tests

Test component integration:

```bash
npm test src/test/SymbolLookupComponents.test.tsx
```

### Manual Testing

1. Test rate limiting by making many requests
2. Test error handling by providing invalid inputs
3. Test provider failover by disabling AI services
4. Test UI components with various states and interactions

## Troubleshooting

### Common Issues

1. **"No AI providers available"**: Check API key configuration and provider status
2. **Rate limit exceeded**: Wait for reset time or increase limits
3. **Slow response times**: Check AI provider performance and network connectivity
4. **Invalid symbols not found**: Verify AI service training data and query formatting

### Debugging

Enable debug logging:

```typescript
// Check service health
const health = await symbolLookupEndpoint.getHealth();
console.log('Service health:', health);

// Check usage stats
const stats = await symbolLookupEndpoint.getUsageStats();
console.log('Usage statistics:', stats);

// Monitor request logs
// (Accessible through the monitoring dashboard)
```

## Future Enhancements

1. **Additional AI Providers**: OpenAI, Perplexity integration
2. **Advanced Caching**: Redis-based distributed caching
3. **Metrics Dashboard**: Real-time analytics and monitoring
4. **Batch Operations**: Support for bulk symbol lookups
5. **Webhook Support**: Real-time notifications for system events
6. **API Versioning**: Support for multiple API versions

## Support

For issues or questions:

1. Check the monitoring dashboard for system status
2. Review error logs for detailed error information
3. Verify AI provider configuration and availability
4. Test with known good symbols to isolate issues
