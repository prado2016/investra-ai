# Debugging Tools Guide

## Table of Contents

1. [Debug Mode Setup](#debug-mode-setup)
2. [Debug Panel Usage](#debug-panel-usage)
3. [Console Debugging](#console-debugging)
4. [Debug Workflow](#debug-workflow)
5. [Performance Monitoring](#performance-monitoring)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Debug Mode Setup

### Environment Configuration

Debug mode is automatically enabled in development environments. Ensure the following configuration:

#### Environment Variables
```bash
NODE_ENV=development    # Enables debug mode
__DEV__=true           # Global flag for development mode
__DEBUG__=true         # Global flag for debug features
```

#### Vite Configuration
The debug system is configured in `vite.config.ts` with:
- Source maps enabled for better debugging
- Enhanced proxy logging
- Debug globals defined

#### Starting Debug Mode
```bash
# Start with debug mode
npm run dev:debug

# Build with debug info
npm run build:debug

# Quick debug alias
npm run debug
```

### Debug System Architecture
```
src/utils/debug.ts          - Core debug utilities
src/components/DebugPanel.tsx - Visual debug interface
src/App.tsx                 - Global error handling integration
vite.config.ts             - Build configuration
```

---

## Debug Panel Usage

### Visual Debug Interface

The debug panel provides a comprehensive visual interface for monitoring application behavior in real-time.

#### Location and Access
- **Location**: Bottom-right corner of the screen (orange bug icon)
- **Toggle**: Click the 🐛 icon to open/close the debug panel

#### Debug Panel Tabs

##### 1. Logs Tab
- Displays all application logs with timestamps and sources
- Real-time log streaming
- Filterable by log level

##### 2. Errors Tab
- Shows caught errors with full stack traces
- Includes error context and metadata
- Unique error IDs for tracking

##### 3. Performance Tab
- Performance measurements and timing data
- Visual performance indicators
- Memory usage tracking

#### Debug Panel Controls

| Control | Icon | Function |
|---------|------|----------|
| Toggle Panel | 🐛 | Open/close the debug panel |
| Auto-scroll | 👁️ | Toggle automatic scrolling for new logs |
| Export | 📥 | Download debug logs as JSON file |
| Clear | 🗑️ | Clear logs for specific tab |

#### Panel Configuration
```javascript
// Force enable debug panel
window.debug.info('Debug panel should be visible');

// Check if panel is responsive
// - Ensure auto-scroll setting is enabled
// - Manually refresh by closing/opening panel
// - Check browser console for errors
```

---

## Console Debugging

### Browser Console Tools

In development, debug tools are attached to the global `window` object for easy access.

#### Debug Logger Commands

```javascript
// Access debug logger
window.debug.info('Custom log message', { data: 'example' });

// View all logs
window.debug.getLogs();

// Clear logs
window.debug.clearLogs();

// Export logs for analysis
window.debug.exportLogs();

// Track performance timing
window.debug.time('my-operation');
// ... perform operation
window.debug.timeEnd('my-operation');
```

#### Error Tracking Commands

```javascript
// Access error tracker
window.errorTracker.getErrors();

// Clear errors
window.errorTracker.clearErrors();

// Track custom error with context
window.errorTracker.trackError(
  new Error('Custom error'), 
  { context: 'additional info' }
);
```

#### Performance Tracking Commands

```javascript
// Access performance tracker
window.performanceTracker.getMeasures();

// Clear measures
window.performanceTracker.clearMeasures();

// Add custom performance marks
window.performanceTracker.mark('operation-start');
// ... perform operation
window.performanceTracker.measure('operation-duration', 'operation-start');
```

### Log Levels and Format

#### Enhanced Console Logging Format
```
[HH:MM:SS.mmm] [LEVEL] [SOURCE] Message
```

#### Log Levels

| Level | Purpose | Example Use |
|-------|---------|-------------|
| **ERROR** | Critical errors that need attention | Database connection failures |
| **WARN** | Warnings and potential issues | Deprecated API usage |
| **INFO** | General information about app state | Component lifecycle events |
| **DEBUG** | Detailed debugging information | Function parameters and returns |
| **LOG** | General application logs | User actions and state changes |

---

## Debug Workflow

### Step-by-Step Debugging Process

#### 1. Issue Identification
1. **Check Debug Panel**: Look at real-time logs and errors in the visual interface
2. **Review Error Tab**: Examine any captured errors with stack traces
3. **Monitor Performance Tab**: Check for slow operations or performance bottlenecks

#### 2. Data Investigation
```javascript
// Example: Investigating missing transaction data
// 1. Check localStorage data
window.debug.info('Checking localStorage for transactions');

// 2. Verify database query results
window.debug.info('Database query result', { totalTransactions: 0 });

// 3. Trace data flow
window.debug.time('data-migration-check');
// ... perform data migration analysis
window.debug.timeEnd('data-migration-check');
```

#### 3. Component-Level Debugging

##### Enhanced Symbol Input Debug Example
```javascript
// Component lifecycle tracking
[14:30:25.123] [INFO] [EnhancedSymbolInput] Starting AI processing { query: "Apple stock" }
[14:30:26.456] [INFO] [EnhancedSymbolInput] AI processing result { query: "Apple stock", result: "AAPL", confidence: 0.95 }
[14:30:26.789] [INFO] [EnhancedSymbolInput] AI symbol validation successful { originalQuery: "Apple stock", parsedSymbol: "AAPL", validatedName: "Apple Inc." }
```

#### 4. Data Migration Debugging Workflow

When encountering data issues:

1. **Navigate to Settings Page** → **Data Migration Section**
2. **Run Analysis**: Check if missing data exists in localStorage
3. **Monitor Migration**: Use debug logs to track migration progress
4. **Verify Results**: Confirm data appears correctly after migration

```javascript
// Example migration debugging
window.debug.info('Starting data migration analysis');
// Check localStorage for April 28, 2025 transactions
window.debug.info('Expected transactions: 3 on 2025-04-28');
```

### Debug Log Export and Analysis

#### Exporting Debug Logs
1. Use the 📥 Export button in the debug panel
2. Or use console command: `window.debug.exportLogs()`
3. Logs are saved as JSON files with timestamps

#### Log Analysis Example
```json
{
  "timestamp": "1749327739544",
  "portfolioId": "03bba374-888c-4e56-83d4-34363510805f",
  "totalTransactions": 0,
  "debugLevel": "INFO",
  "source": "DailyPnLService"
}
```

---

## Performance Monitoring

### Automatic Performance Tracking

The debug system automatically tracks:

#### Core Performance Metrics
- **AI Symbol Processing Time**: Time taken for symbol recognition and validation
- **Component Render Performance**: React component render duration
- **API Response Times**: Network request performance
- **Database Query Performance**: Database operation timing

#### Performance Tracking Implementation

```javascript
// High-precision timing using performance.now()
class PerformanceTracker {
  // Memory-efficient storage
  // Automatic cleanup
  // Visual performance indicators
}
```

### Custom Performance Monitoring

#### Adding Performance Marks
```javascript
// Mark the start of an operation
window.performanceTracker.mark('operation-start');

// Perform your operation
await someAsyncOperation();

// Measure the duration
window.performanceTracker.measure('operation-duration', 'operation-start');
```

#### Performance Best Practices
1. **Track Critical Operations**: Focus on user-facing performance
2. **Use Meaningful Names**: Clear operation identifiers
3. **Monitor Regularly**: Check performance tab for trends
4. **Clean Up**: Clear old measurements to prevent memory leaks

### Performance Analysis

#### Identifying Performance Issues
1. **Check Performance Tab**: Look for operations taking >100ms
2. **Monitor Memory Usage**: Watch for memory leaks in component lifecycle logs
3. **API Response Analysis**: Identify slow network requests
4. **Component Render Time**: Find components with slow render cycles

---

## Troubleshooting

### Common Issues and Solutions

#### Debug Panel Issues

**Debug Panel not showing:**
- ✅ Ensure you're in development mode (`NODE_ENV=development`)
- ✅ Check browser console for errors
- ✅ Verify the debug panel is enabled in the component

**Panel not opening:**
```javascript
// Force enable debug panel
window.debug.info('Debug panel should be visible');
```

**Logs not updating:**
- ✅ Check auto-scroll setting (👁️ icon)
- ✅ Manually refresh by closing/opening panel
- ✅ Check browser console for errors

#### Logging Issues

**Missing logs:**
- ✅ Check if the component is properly importing debug utilities
- ✅ Verify log level configuration
- ✅ Ensure debug mode is enabled

**Log Level Configuration:**
```javascript
// Ensure appropriate log levels are being used
window.debug.error('Critical error');  // Use for critical issues
window.debug.info('General state');    // Use for general information
window.debug.debug('Detailed info');   // Use for detailed debugging
```

#### Performance Issues

**Performance problems:**
- ✅ Check performance tab for slow operations
- ✅ Look for memory leaks in component lifecycle logs
- ✅ Monitor API response times
- ✅ Analyze component render performance

### Data Migration Issues

When debugging data availability problems:

1. **Verify Data Source**: Check localStorage using the Settings page migration tool
2. **Monitor Migration Process**: Use debug logs to track migration progress
3. **Validate Results**: Confirm data appears in the UI after migration

---

## Best Practices

### For Developers

#### Logging Best Practices
1. **Use Appropriate Log Levels**: 
   - `ERROR` for critical issues
   - `INFO` for general state changes
   - `DEBUG` for detailed information

2. **Include Context**: Always provide relevant data with log messages
   ```javascript
   window.debug.info('User action completed', { 
     action: 'portfolio-update', 
     userId: user.id, 
     timestamp: Date.now() 
   });
   ```

3. **Performance Tracking**: Use `PerformanceTracker` for timing critical operations
   ```javascript
   window.debug.time('database-query');
   await performDatabaseQuery();
   window.debug.timeEnd('database-query');
   ```

4. **Error Context**: Provide meaningful context when tracking errors
   ```javascript
   window.errorTracker.trackError(error, {
     component: 'EnhancedSymbolInput',
     userAction: 'symbol-validation',
     inputValue: symbolInput
   });
   ```

#### For Debugging Issues

1. **Systematic Approach**:
   - Start with the Debug Panel for real-time monitoring
   - Export logs for offline analysis
   - Use browser console for deeper investigation
   - Check performance tab for optimization opportunities

2. **Document Findings**: Export debug logs with timestamps for issue tracking

3. **Test Thoroughly**: Verify fixes using the complete debug workflow

### Production Considerations

#### Security and Performance
- ✅ Debug logging is automatically disabled in production builds
- ✅ Error tracking remains active for monitoring
- ✅ Performance tracking can be optionally enabled
- ✅ Debug panel is hidden in production
- ✅ No sensitive data logging in production
- ✅ Secure error reporting integration points

#### Debug Mode in Production
- Debug tools are only exposed in development environments
- Error tracking continues for production monitoring
- Performance metrics can be selectively enabled for production analysis

---

This comprehensive debugging tools guide provides all the necessary information for effectively debugging the Stock Tracker application using the built-in debug infrastructure. The combination of visual debugging panels, console tools, and systematic workflows ensures efficient problem identification and resolution.