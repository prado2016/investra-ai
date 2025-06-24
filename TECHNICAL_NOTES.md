# Technical Notes - Email Puller Deployment Issues

## Issue Summary
**Date:** June 24, 2025  
**Component:** Email Puller Staging Deployment  
**Status:** Resolved  

## Problem Description
The email puller service was failing to start automatically and exhibiting rapid restart cycles on the staging server. The service would connect to the database but immediately exit, causing PM2 to continuously restart it.

## Root Cause Analysis

### Initial Symptoms
- Email puller showing as "idle" for 27+ hours despite 30-minute sync interval
- PM2 process showing as "stopped" on staging server
- Frontend showing `syncStatus: undefined` and `lastSync: undefined`

### Investigation Timeline

1. **Process Status Check** - Discovered PM2 process was stopped
2. **Manual Restart** - PM2 process restarted but immediately crashed with "supabaseUrl is required" 
3. **Deployment Workflow Analysis** - Found multiple issues in staging deployment

### Critical Issues Identified

#### Issue #1: Missing Build Dependencies
**Problem:** Deployment workflow only copied `dist/imap-puller.js` but missing dependencies like `config.js`, `logger.js`, etc.
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/opt/investra/email-puller-staging/config.js'
```

**Initial Fix Attempt:** Modified workflow to copy all `dist/*` files and install dependencies
```yaml
# Copy all built files from dist directory
sudo cp -r dist/* /opt/investra/email-puller-staging/
# Install production dependencies
sudo npm ci --only=production
```

#### Issue #2: Missing Environment Variables
**Problem:** No `.env` file with Supabase credentials on staging server
```
Error: supabaseUrl is required.
```

**Fix:** Added environment file creation to deployment workflow
```yaml
# Create environment file with required variables
sudo bash -c "echo 'SUPABASE_URL=${{ secrets.SUPABASE_URL }}' > .env"
sudo bash -c "echo 'SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }}' >> .env"
```

#### Issue #3: PM2 Environment Loading
**Problem:** PM2 not loading environment variables properly
```bash
pm2 start imap-puller.js --name investra-email-puller-staging --env-file .env
```

#### Issue #4: Over-Engineering the Deployment (Final Root Cause)
**Problem:** The "improved" deployment copying all files and installing dependencies actually broke the working system.

**Evidence:** 
- Commit `969cbd68cc85988bf163aa5ae53e4c72d3c54a8a` was working fine
- Issues started after deployment workflow changes
- Email puller connected to database but exited with "Invalid API key" despite correct credentials

## Resolution

### Final Solution
Reverted to simple deployment approach while keeping environment variable creation:

```yaml
# Deploy to staging location (SIMPLE APPROACH)
sudo mkdir -p /opt/investra/email-puller-staging
sudo cp dist/imap-puller.js /opt/investra/email-puller-staging/
sudo cp package.json /opt/investra/email-puller-staging/

# Keep environment file creation
sudo bash -c "echo 'SUPABASE_URL=${{ secrets.SUPABASE_URL }}' > .env"
# ... other env vars
```

### Why This Works
- The built `imap-puller.js` file is self-contained with bundled dependencies
- No need to install additional npm packages on staging
- Environment variables properly loaded via `.env` file
- PM2 can start the process without dependency conflicts

## Lessons Learned

### 1. **Don't Over-Engineer Working Systems**
The original simple deployment was working fine. Adding complexity (copying all files, installing dependencies) introduced new failure modes.

### 2. **Build Process vs Runtime Dependencies**
The TypeScript build process creates a self-contained JS file. Trying to install runtime dependencies can conflict with bundled versions.

### 3. **Environment Variable Precedence**
PM2 environment loading can be tricky. Using `.env` files with explicit `--env-file` flag is more reliable than other methods.

### 4. **Debugging Process Management**
When services fail to start:
1. Check process manager status (PM2)
2. Run manually outside process manager
3. Check logs for actual error messages
4. Verify environment variable loading

## Prevention Measures

### 1. **Staging Environment Monitoring**
- Add health checks for email puller service
- Monitor sync status and alert on prolonged idle periods
- Implement automated restart monitoring

### 2. **Deployment Testing**
- Test deployment changes on separate staging environment first
- Validate service starts and connects to database
- Verify environment variable loading

### 3. **Rollback Strategy**
- Keep deployment workflows simple and atomic
- Document working configurations
- Maintain ability to quickly revert to last known good state

## Configuration Files

### Working Deployment Workflow Section
```yaml
# Deploy to staging location
sudo mkdir -p /opt/investra/email-puller-staging
sudo cp dist/imap-puller.js /opt/investra/email-puller-staging/
sudo cp package.json /opt/investra/email-puller-staging/

# Create environment file with required variables
echo "Creating .env file for email puller staging"
sudo bash -c "echo 'SUPABASE_URL=${{ secrets.SUPABASE_URL }}' > .env"
sudo bash -c "echo 'SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }}' >> .env"
sudo bash -c "echo 'VITE_SUPABASE_URL=${{ secrets.SUPABASE_URL }}' >> .env"
sudo bash -c "echo 'VITE_SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }}' >> .env"
sudo bash -c "echo 'SYNC_INTERVAL_MINUTES=30' >> .env"
sudo bash -c "echo 'MAX_EMAILS_PER_SYNC=50' >> .env"
sudo bash -c "echo 'ENABLE_SCHEDULER=true' >> .env"
sudo bash -c "echo 'ARCHIVE_AFTER_SYNC=true' >> .env"
sudo bash -c "echo 'PROCESSED_FOLDER_NAME=Investra/Processed' >> .env"
sudo bash -c "echo 'ENABLE_LOGGING=true' >> .env"
sudo bash -c "echo 'LOG_LEVEL=info' >> .env"

# Start with environment file
sudo pm2 start imap-puller.js --name investra-email-puller-staging --env-file .env
```

### Environment Variables Required
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SYNC_INTERVAL_MINUTES=30
MAX_EMAILS_PER_SYNC=50
ENABLE_SCHEDULER=true
ARCHIVE_AFTER_SYNC=true
PROCESSED_FOLDER_NAME=Investra/Processed
ENABLE_LOGGING=true
LOG_LEVEL=info
```

## Status
- ✅ Email puller deployment workflow fixed
- ✅ Environment variables properly configured
- ✅ PM2 process management working
- ✅ Service ready for automatic sync resumption

## Next Steps
1. Monitor staging environment for 24 hours to ensure stable operation
2. Apply same fix to production deployment if needed
3. Implement monitoring alerts for service health
4. Document operational procedures for future deployments