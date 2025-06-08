# Debug Mode Documentation

## Overview

The Stock Tracker application now includes a comprehensive debug system to help detect and diagnose errors during development. Debug mode is automatically enabled in development environment and provides real-time monitoring of application behavior.

## Features

### 1. Debug Panel (Visual Interface)
- **Location**: Bottom-right corner of the screen (orange bug icon)
- **Tabs**: 
  - **Logs**: All application logs with timestamps and sources
  - **Errors**: Caught errors with stack traces and context
  - **Performance**: Performance measurements and timing data

#### Debug Panel Controls:
- 🐛 **Toggle Icon**: Click to open/close the debug panel
- 👁️ **Auto-scroll**: Toggle automatic scrolling for new logs
- 📥 **Export**: Download debug logs as JSON file
- 🗑️ **Clear**: Clear logs for specific tab

### 2. Console Logging
Enhanced console logging with structured format:
```
[HH:MM:SS.mmm] [LEVEL] [SOURCE] Message
```

#### Log Levels:
- **ERROR**: Critical errors that need attention
- **WARN**: Warnings and potential issues
- **INFO**: General information about app state
- **DEBUG**: Detailed debugging information
- **LOG**: General application logs

### 3. Performance Monitoring
Automatic tracking of:
- AI symbol processing time
- Component render performance
- API response times
- Database query performance

### 4. Error Tracking
Comprehensive error tracking including:
- Unhandled JavaScript errors
- Promise rejections
- Component boundary errors
- Network failures
- API errors

## Usage

### Accessing Debug Tools

#### Browser Console
In development, debug tools are attached to the global `window` object:

```javascript
// Access debug logger
window.debug.info('Custom log message', { data: 'example' });

// View all logs
window.debug.getLogs();

// Clear logs
window.debug.clearLogs();

// Export logs
window.debug.exportLogs();

// Track performance
window.debug.time('my-operation');
// ... do something
window.debug.timeEnd('my-operation');
```

#### Error Tracking
```javascript
// Access error tracker
window.errorTracker.getErrors();

// Clear errors
window.errorTracker.clearErrors();

// Track custom error
window.errorTracker.trackError(new Error('Custom error'), { context: 'additional info' });
```

#### Performance Tracking
```javascript
// Access performance tracker
window.performanceTracker.getMeasures();

// Clear measures
window.performanceTracker.clearMeasures();

// Add custom performance marks
window.performanceTracker.mark('operation-start');
// ... do something
window.performanceTracker.measure('operation-duration', 'operation-start');
```

### Debug Configuration

#### Environment Variables
- `NODE_ENV=development`: Enables debug mode
- `__DEV__`: Global flag for development mode
- `__DEBUG__`: Global flag for debug features

#### Vite Configuration
The debug system is configured in `vite.config.ts`:
- Source maps enabled for better debugging
- Enhanced proxy logging
- Debug globals defined

### Component Debugging

#### Enhanced Symbol Input Debug
The `EnhancedSymbolInput` component includes extensive debug logging:
- Component lifecycle events
- AI processing steps
- Symbol validation results
- Performance measurements

Example debug output:
```
[14:30:25.123] [INFO] [EnhancedSymbolInput] Starting AI processing { query: "Apple stock" }
[14:30:26.456] [INFO] [EnhancedSymbolInput] AI processing result { query: "Apple stock", result: "AAPL", confidence: 0.95 }
[14:30:26.789] [INFO] [EnhancedSymbolInput] AI symbol validation successful { originalQuery: "Apple stock", parsedSymbol: "AAPL", validatedName: "Apple Inc." }
```

### Debug Scripts

#### Package.json Scripts
```bash
# Start with debug mode
npm run dev:debug

# Build with debug info
npm run build:debug

# Quick debug alias
npm run debug
```

### Best Practices

#### For Developers
1. **Use appropriate log levels**: Error for critical issues, info for general state, debug for detailed information
2. **Include context**: Always provide relevant data with log messages
3. **Performance tracking**: Use `PerformanceTracker` for timing critical operations
4. **Error context**: Provide context when tracking errors

#### For Debugging Issues
1. **Check Debug Panel**: Look at real-time logs and errors
2. **Export logs**: Download logs for offline analysis
3. **Console investigation**: Use browser console for deeper investigation
4. **Performance analysis**: Check performance tab for slow operations

### Troubleshooting

#### Common Issues

**Debug Panel not showing:**
- Ensure you're in development mode (`NODE_ENV=development`)
- Check browser console for errors
- Verify the debug panel is enabled in the component

**Missing logs:**
- Check if the component is properly importing debug utilities
- Verify log level configuration
- Ensure debug mode is enabled

**Performance issues:**
- Check performance tab for slow operations
- Look for memory leaks in component lifecycle logs
- Monitor API response times

#### Debug Panel Issues

**Panel not opening:**
```javascript
// Force enable debug panel
window.debug.info('Debug panel should be visible');
```

**Logs not updating:**
- Check auto-scroll setting
- Manually refresh by closing/opening panel
- Check browser console for errors

### Technical Details

#### Debug System Architecture
```
src/utils/debug.ts          - Core debug utilities
src/components/DebugPanel.tsx - Visual debug interface
src/App.tsx                 - Global error handling integration
vite.config.ts             - Build configuration
```

#### Debug Logger Class
- Singleton pattern for consistent logging
- In-memory log storage (last 100 entries)
- Automatic cleanup and rotation
- Export functionality for analysis

#### Error Tracker Class
- Global error handling
- Context preservation
- Unique error IDs for tracking
- Integration with error reporting services

#### Performance Tracker Class
- High-precision timing using `performance.now()`
- Memory-efficient storage
- Automatic cleanup
- Visual performance indicators

### Production Considerations

#### Debug Mode in Production
- Debug logging is automatically disabled in production builds
- Error tracking remains active for monitoring
- Performance tracking can be optionally enabled
- Debug panel is hidden in production

#### Security
- Debug tools are only exposed in development
- No sensitive data logging in production
- Secure error reporting integration points

This debug system provides comprehensive monitoring and troubleshooting capabilities for the Stock Tracker application, making it easier to identify and resolve issues during development.
