# Sentry Setup Guide for Investra AI

This guide covers setting up Sentry error monitoring for the Investra AI project.

## Overview

Sentry has been configured for all three main components:
- **Frontend (React/Vite)**: `@sentry/react` with `@sentry/vite-plugin`
- **Server (Node.js/Express)**: `@sentry/node`
- **Email Puller Service**: `@sentry/node`

## 1. Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account or log in
2. Create a new project and select the appropriate platform:
   - For frontend: React
   - For backend: Node.js
3. Note down your **DSN (Data Source Name)** - it looks like:
   ```
   https://your-key@o123456.ingest.sentry.io/123456
   ```

## 2. Environment Variables

Add these environment variables to your deployment:

### Required Variables
```bash
# Main DSN for error reporting
VITE_SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/123456  # Frontend
SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/123456       # Server & Email Puller

# Optional: App version for release tracking
VITE_APP_VERSION=1.0.0
APP_VERSION=1.0.0
```

### Optional Variables (for sourcemap upload in production)
```bash
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token
```

## 3. GitHub Secrets Setup

Add these secrets to your GitHub repository:

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `SENTRY_DSN`: Your Sentry DSN
   - `SENTRY_ORG`: Your Sentry organization slug (optional)
   - `SENTRY_PROJECT`: Your Sentry project slug (optional)
   - `SENTRY_AUTH_TOKEN`: Your Sentry auth token (optional)

## 4. Local Development

For local development, copy `.env.example` to `.env.local` and set:

```bash
VITE_SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/123456
SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/123456
```

## 5. Sentry Features Configured

### Frontend
- **Error Boundary Integration**: Automatic error capture from React components
- **Performance Monitoring**: Page load and navigation tracking
- **Breadcrumbs**: User interaction tracking
- **User Context**: Automatic user identification
- **Release Tracking**: Version-based error grouping

### Server
- **Request/Response Tracking**: Automatic API error capture
- **Performance Monitoring**: API endpoint performance
- **Database Error Tracking**: Supabase integration errors
- **WebSocket Error Tracking**: Real-time connection issues

### Email Puller
- **Service Monitoring**: IMAP connection and sync errors
- **Configuration Validation**: Setup and auth issues
- **Scheduled Task Tracking**: Email sync failures

## 6. Testing Sentry Integration

### Frontend Test
Add this to any component to test error capturing:
```javascript
import { captureError } from '../lib/sentry';

// Test error capture
captureError(new Error('Test error from frontend'), {
  component: 'TestComponent',
  action: 'manual_test'
});
```

### Server Test
Add this to any route handler:
```javascript
import * as Sentry from '@sentry/node';

// Test error capture
Sentry.captureException(new Error('Test error from server'));
```

### Email Puller Test
The service automatically captures errors during startup and sync operations.

## 7. Monitoring and Alerts

### Recommended Alert Rules
1. **Error Rate Threshold**: Alert when error rate > 5% over 10 minutes
2. **New Issues**: Alert on first occurrence of new errors
3. **Performance Degradation**: Alert when response time increases significantly
4. **Email Sync Failures**: Alert when email puller service fails

### Dashboard Metrics
- Error frequency and trends
- Performance metrics by component
- User impact analysis
- Release-based error tracking

## 8. Sentry Configuration Details

### Sample Rates
- **Development**: 100% error capture, 100% performance monitoring
- **Production**: 80% error capture, 10% performance monitoring

### Filtered Events
- Health check requests (server)
- ResizeObserver loop errors (frontend)
- Non-error promise rejections (frontend)

### Release Tracking
Releases are automatically tagged with:
- Environment (development/staging/production)
- Version from `APP_VERSION` or package.json
- Git commit hash (when available)

## 9. Troubleshooting

### Common Issues

**Sentry not capturing errors:**
- Check that `SENTRY_DSN` environment variables are set
- Verify DSN format is correct
- Check console for Sentry initialization messages

**Source maps not uploading:**
- Ensure `SENTRY_AUTH_TOKEN` is set in production
- Verify `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry settings
- Check build logs for Vite plugin output

**Too many events:**
- Adjust sample rates in Sentry configuration
- Add more specific event filtering
- Use Sentry's inbound filters to reduce noise

### Debug Mode
Enable debug mode in development by setting:
```bash
VITE_DEBUG_SENTRY=true
```

## 10. Next Steps

1. **Set up Sentry account and project**
2. **Add GitHub secrets**
3. **Deploy and verify error capture**
4. **Configure alerts and notifications**
5. **Set up team access and permissions**
6. **Create custom dashboards for monitoring**

## Support

For issues with Sentry setup:
1. Check Sentry documentation: https://docs.sentry.io/
2. Review error patterns in Sentry dashboard
3. Use debug mode for troubleshooting
4. Check GitHub Actions logs for deployment issues