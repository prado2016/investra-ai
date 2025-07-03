# Investra AI - Complete Setup & Deployment Guide

## Table of Contents

1. [Initial Setup](#1-initial-setup)
2. [Database Setup](#2-database-setup)
3. [Authentication & Security](#3-authentication--security)
4. [CI/CD Pipeline](#4-cicd-pipeline)
5. [Production Deployment](#5-production-deployment)
6. [Monitoring & Maintenance](#6-monitoring--maintenance)

---

## 1. Initial Setup

### 1.1 Project Setup

**Prerequisites:**
- Node.js 18+ installed
- Git configured
- Supabase account and project
- GitHub repository access

**Environment Configuration:**
```bash
# Required environment variables for development
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:3001

# Optional configuration
VITE_APP_VERSION=1.0.0
VITE_DEBUG_SENTRY=true
```

**Initial Installation:**
```bash
# Clone repository
git clone https://github.com/your-username/investra-ai.git
cd investra-ai

# Install dependencies
npm install

# Start development server
npm run dev
# Access: http://localhost:5173

# Start backend API (separate terminal)
cd server
npm install
npm run build
node dist/simple-production-server.js
# Access: http://localhost:3001
```

### 1.2 System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web UI        │    │   Database       │    │  Email-Puller   │
│   Settings      │◄──►│  system_config   │◄──►│   Service       │
│   Page          │    │   Table          │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                        │                       │
        │                        │                       │
        ▼                        ▼                       ▼
    Real-time UI          Centralized Config      Auto-loading Config
    Configuration         Storage & RLS           + Fallback Support
```

---

## 2. Database Setup

### 2.1 Schema Creation

**Create System Configuration Table:**

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Create system_config table for centralized configuration
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  config_type VARCHAR(20) DEFAULT 'string' CHECK (config_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);

-- RLS policies
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Service role can read/write all config
CREATE POLICY "Service can manage system config" ON system_config
  FOR ALL USING (true);
```

**Insert Default Configuration:**

```sql
-- Insert default configuration values
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
  ('email_encryption_key', 'auto_generated_on_first_run', 'string', 'Encryption key for Gmail passwords'),
  ('sync_interval_minutes', '30', 'number', 'Default sync interval in minutes'),
  ('max_emails_per_sync', '50', 'number', 'Maximum emails to process per sync'),
  ('enable_logging', 'true', 'boolean', 'Enable detailed logging'),
  ('log_level', 'info', 'string', 'Logging level (debug, info, warn, error)'),
  ('enable_scheduler', 'true', 'boolean', 'Enable automatic scheduled syncing'),
  ('archive_after_sync', 'true', 'boolean', 'Move emails to processed table after sync'),
  ('processed_folder_name', 'Investra/Processed', 'string', 'Gmail folder for processed emails'),
  ('sync_request_poll_interval', '10', 'number', 'Seconds between checking for manual sync requests'),
  ('cleanup_old_requests_days', '7', 'number', 'Days to keep old sync requests')
ON CONFLICT (config_key) DO NOTHING;
```

### 2.2 API Key Management

**Add API Key Support:**

```sql
-- Add API key configuration to system_config table
INSERT INTO system_config (config_key, config_value, config_type, description, is_encrypted) VALUES
  -- Google Gemini AI API Key
  ('gemini_api_key', '', 'string', 'Google Gemini AI API key for AI-powered features', true),
  ('gemini_model', 'gemini-1.5-flash', 'string', 'Default Gemini model to use', false),
  
  -- OpenAI API Key
  ('openai_api_key', '', 'string', 'OpenAI API key for GPT models', true),
  ('openai_model', 'gpt-4o', 'string', 'Default OpenAI model to use', false),
  
  -- Yahoo Finance API Key
  ('yahoo_finance_api_key', '', 'string', 'Yahoo Finance API key for market data', true),
  
  -- Perplexity AI API Key
  ('perplexity_api_key', '', 'string', 'Perplexity AI API key', true),
  ('perplexity_model', 'llama-3.1-sonar-large-128k-online', 'string', 'Default Perplexity model to use', false),
  
  -- OpenRouter API Key
  ('openrouter_api_key', '', 'string', 'OpenRouter API key for multiple AI models', true),
  ('openrouter_model', 'anthropic/claude-3.5-sonnet', 'string', 'Default OpenRouter model to use', false),
  
  -- AI Service Configuration
  ('default_ai_provider', 'gemini', 'string', 'Default AI provider to use for symbol lookup and parsing', false),
  ('ai_timeout_seconds', '30', 'number', 'Timeout for AI API calls in seconds', false),
  ('ai_retry_attempts', '3', 'number', 'Number of retry attempts for failed AI requests', false)
  
ON CONFLICT (config_key) DO NOTHING;
```

**API Key Helper Functions:**

```sql
-- Helper functions for API keys
CREATE OR REPLACE FUNCTION get_api_key(provider_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN '';
  END IF;
  
  SELECT config_value INTO api_key
  FROM system_config
  WHERE config_key = provider_name || '_api_key'
  AND is_encrypted = true;
  
  RETURN COALESCE(api_key, '');
END;
$$;

CREATE OR REPLACE FUNCTION set_api_key(provider_name text, key_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to set API keys';
  END IF;
  
  INSERT INTO system_config (config_key, config_value, config_type, is_encrypted, updated_at)
  VALUES (provider_name || '_api_key', key_value, 'string', true, NOW())
  ON CONFLICT (config_key) 
  DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = NOW();
END;
$$;
```

### 2.3 Manual Sync Database Setup

**Create Sync Requests Table:**

```sql
-- Create sync_requests table for database-driven manual sync
CREATE TABLE IF NOT EXISTS sync_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  request_type VARCHAR(50) DEFAULT 'manual_sync',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  result JSONB,
  created_by VARCHAR(100) DEFAULT 'ui_manual_trigger'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_requests_status_user 
ON sync_requests(status, user_id, requested_at);

CREATE INDEX IF NOT EXISTS idx_sync_requests_processed_at 
ON sync_requests(processed_at);

-- RLS policies
ALTER TABLE sync_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sync requests
CREATE POLICY "Users can view own sync requests" ON sync_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own sync requests  
CREATE POLICY "Users can create own sync requests" ON sync_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update any sync request (for email-puller)
CREATE POLICY "Service can update sync requests" ON sync_requests
  FOR UPDATE USING (true);
```

### 2.4 Database Verification

**Verify Setup:**

```sql
-- Check system_config table has all entries
SELECT config_key, config_type, is_encrypted, description 
FROM system_config 
ORDER BY config_key;

-- Check recent sync requests
SELECT 
  id,
  user_id,
  status,
  requested_at,
  processed_at,
  result
FROM sync_requests 
ORDER BY requested_at DESC 
LIMIT 10;
```

---

## 3. Authentication & Security

### 3.1 GitHub Secrets Setup

**Required GitHub Repository Secrets:**

1. Go to: `https://github.com/your-username/investra-ai/settings/secrets/actions`
2. Add these secrets:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Email Configuration  
EMAIL_ENCRYPTION_KEY=your-32-character-encryption-key

# Sentry Monitoring (Optional)
SENTRY_DSN=https://your-key@sentry.io/project-id
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token

# Deployment (if using SSH)
RHEL_HOST=your-server-ip
RHEL_USER=your-ssh-username
RHEL_SSH_KEY=your-private-ssh-key
```

### 3.2 SSH Key Setup (If Required)

**Generate SSH Key Pair:**

```bash
# Generate new SSH key pair
ssh-keygen -t rsa -b 4096 -f ~/.ssh/investra_rsa -N ""

# This creates:
# ~/.ssh/investra_rsa (private key) 
# ~/.ssh/investra_rsa.pub (public key)
```

**Install Public Key on Server:**

```bash
# Copy public key to server
ssh-copy-id -i ~/.ssh/investra_rsa.pub user@your-server

# Set proper permissions
ssh user@your-server "chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

**Add Private Key to GitHub Secrets:**

```bash
# Display private key
cat ~/.ssh/investra_rsa

# Copy ENTIRE output including -----BEGIN and -----END lines
# Add to GitHub Secrets as RHEL_SSH_KEY
```

### 3.3 Sentry Setup

**Create Sentry Project:**

1. Go to [sentry.io](https://sentry.io) and create account
2. Create new project for React and Node.js
3. Note your DSN: `https://your-key@sentry.io/project-id`

**Environment Variables:**

```bash
# Frontend Sentry
VITE_SENTRY_DSN=https://your-key@sentry.io/project-id
VITE_APP_VERSION=1.0.0

# Backend Sentry
SENTRY_DSN=https://your-key@sentry.io/project-id
APP_VERSION=1.0.0

# Optional: For sourcemap upload
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token
```

### 3.4 Self-Hosted Runner Setup (Alternative to SSH)

**Benefits:**
- No SSH key management required
- Faster deployments
- Better security
- Runs directly on your server

**Setup Steps:**

```bash
# SSH into your server (one-time setup)
ssh user@your-server

# Create runner directory
mkdir -p ~/actions-runner && cd ~/actions-runner

# Download GitHub runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract and configure
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
./config.sh --url https://github.com/your-username/investra-ai --token YOUR_RUNNER_TOKEN

# Install as service
sudo ./svc.sh install
sudo ./svc.sh start
```

**Get Runner Token:**
1. Go to repository → Settings → Actions → Runners
2. Click "New self-hosted runner"
3. Copy token from configuration command

**Update Workflow:**

```yaml
jobs:
  deploy:
    runs-on: self-hosted  # Uses your server directly
    # Remove all SSH-related steps
```

---

## 4. CI/CD Pipeline

### 4.1 GitHub Actions Workflows

**Main CI/CD Pipeline (`.github/workflows/ci.yml`):**

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**
1. **Code Quality & Linting**
   - ESLint for code style
   - TypeScript type checking
   - Code quality standards

2. **Test Suite**
   - Unit tests (fast, isolated)
   - Integration tests (service interactions)
   - E2E tests (full workflows with Playwright)
   - Parallel execution for speed

3. **Coverage Analysis**
   - Generates comprehensive coverage reports
   - Enforces 70% minimum coverage threshold
   - Uploads to Codecov
   - Comments on PRs with coverage comparison

4. **Security Scan**
   - `npm audit` for dependency vulnerabilities
   - CodeQL static analysis
   - Security pattern detection

5. **Build Verification**
   - Tests builds for multiple environments
   - Validates build artifacts
   - Ensures deployable outputs

6. **Performance Testing**
   - Lighthouse CI for performance metrics
   - Accessibility, best practices, SEO testing
   - Performance budget enforcement

### 4.2 Quality Gates

**Code Quality Requirements:**
- ✅ ESLint passes with no errors
- ✅ TypeScript compilation successful
- ✅ All tests pass (unit, integration, e2e)

**Coverage Thresholds:**
- ✅ Statements: ≥70%
- ✅ Branches: ≥70%
- ✅ Functions: ≥70%
- ✅ Lines: ≥70%

**Security Requirements:**
- ✅ No high/critical npm audit vulnerabilities
- ✅ CodeQL security scan passes
- ✅ No large files committed

**Performance Requirements:**
- ✅ Lighthouse performance score ≥80%
- ✅ Accessibility score ≥90%
- ✅ Build size within limits

### 4.3 Commit Standards

**Conventional Commits Required:**

```bash
feat: add new feature
fix: bug fix
docs: documentation changes
style: code style changes
refactor: code refactoring
test: test additions/modifications
chore: maintenance tasks
```

### 4.4 Release Process

**Automated Release Pipeline:**

1. **Create Git Tag:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Release Pipeline Runs:**
   - Full test suite validation
   - Production build generation
   - Changelog generation
   - GitHub release creation
   - Production deployment

---

## 5. Production Deployment

### 5.1 Environment Setup

**Production Environment Variables:**

```bash
# Core Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_API_BASE_URL=https://your-production-domain.com

# Email-Puller Minimal Config
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key

# Monitoring
SENTRY_DSN=https://your-key@sentry.io/project-id
VITE_SENTRY_DSN=https://your-key@sentry.io/project-id
APP_VERSION=1.0.0

# Security
EMAIL_ENCRYPTION_KEY=your-32-character-encryption-key
```

### 5.2 Server Deployment

**Frontend Deployment:**

```bash
# Build production version
npm run build

# Deploy build directory to your web server
# Files will be in ./dist directory
```

**Backend API Deployment:**

```bash
# Navigate to server directory
cd server
npm install
npm run build

# Start production server
node dist/simple-production-server.js
# Or use PM2 for process management
pm2 start dist/simple-production-server.js --name "investra-api"
```

**Email-Puller Service Deployment:**

```bash
# Minimal .env configuration
cat > /opt/investra/email-puller/.env << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key
EOF

# Start service with PM2
pm2 start email-puller/dist/imap-puller.js --name "investra-email-puller"
```

### 5.3 Health Checks

**Health Check Endpoints:**

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `GET /health` | System health status | 200 OK with system metrics |
| `GET /api/status` | Service operational status | 200 OK with feature status |

**Health Check Commands:**

```bash
# Check API health
curl -s https://your-domain.com:3001/health | jq .

# Check service status
curl -s https://your-domain.com:3001/api/status | jq .

# Check frontend accessibility
curl -s https://your-domain.com | head -10
```

### 5.4 Performance Benchmarks

**Target Performance Metrics:**
- **Frontend Load Time:** <3 seconds
- **API Response Time:** <1 second
- **Email Processing:** <10 seconds per email
- **Database Queries:** <500ms

### 5.5 Deployment Verification

**Post-Deployment Checklist:**

- [ ] Frontend loads correctly
- [ ] API health checks pass
- [ ] Database connections established
- [ ] Email-puller service running
- [ ] Manual sync functionality works
- [ ] Error monitoring active
- [ ] SSL certificates valid
- [ ] Performance metrics within targets

---

## 6. Monitoring & Maintenance

### 6.1 Sentry Monitoring

**Configured Features:**

**Frontend Monitoring:**
- Error boundary integration
- Performance monitoring
- User interaction tracking
- Release-based error grouping

**Backend Monitoring:**
- API error capture
- Database error tracking
- WebSocket error monitoring
- Performance tracking

**Email-Puller Monitoring:**
- Service monitoring
- IMAP connection errors
- Sync failure tracking
- Configuration validation

### 6.2 Health Monitoring

**Key Metrics to Monitor:**
- **Response Time:** API endpoints <1 second
- **Memory Usage:** <100MB for normal operations
- **Error Rate:** <1% for valid requests
- **Uptime:** Target 99.9% availability

**Monitoring Commands:**

```bash
# Check system processes
ps aux | grep -E "(vite|node|pm2)"

# Monitor logs in real-time
tail -f server/logs/email-api-*.log

# Check system resources
htop
df -h
free -m
```

### 6.3 Log Management

**Log Locations:**
- **Application Logs:** `server/logs/`
- **Combined Logs:** `server/combined.log`
- **PM2 Logs:** `~/.pm2/logs/`

**Log Commands:**

```bash
# View recent logs
tail -f server/combined.log

# Search for errors
grep ERROR server/combined.log

# Monitor PM2 services
pm2 logs investra-email-puller --lines 20
pm2 monit
```

### 6.4 Maintenance Procedures

**Daily Tasks:**
- [ ] Check system health status
- [ ] Review error logs
- [ ] Monitor performance metrics
- [ ] Verify backup completion

**Weekly Tasks:**
- [ ] Review security logs
- [ ] Update system documentation
- [ ] Test backup recovery procedures
- [ ] Performance trend analysis

**Monthly Tasks:**
- [ ] Security patch updates
- [ ] SSL certificate renewal check
- [ ] Capacity planning review
- [ ] Disaster recovery testing

**Quarterly Tasks:**
- [ ] Full security audit
- [ ] Performance optimization review
- [ ] Documentation updates
- [ ] Training updates

### 6.5 Troubleshooting Guide

**Common Issues:**

**Email-Puller Service Failures:**
```bash
# Check service status
pm2 status investra-email-puller

# Check logs for errors
pm2 logs investra-email-puller --lines 50

# Restart service
pm2 restart investra-email-puller

# Check database configuration
SELECT config_key, config_value FROM system_config 
WHERE config_key LIKE '%sync%' OR config_key LIKE '%email%';
```

**Database Connection Issues:**
- Verify Supabase service status
- Check environment variables
- Test connection with health endpoints
- Review RLS policies

**API Performance Issues:**
```bash
# Check API response times
curl -w "@curl-format.txt" -s -o /dev/null https://your-domain.com/api/status

# Monitor resource usage
htop
iotop
```

**Frontend Loading Issues:**
- Clear browser cache
- Check console for JavaScript errors
- Verify build deployment
- Test with different browsers

### 6.6 Backup and Recovery

**Backup Procedures:**
1. **Database:** Supabase automatic backups enabled
2. **Application:** Source code in Git version control
3. **Configuration:** Environment variables documented
4. **Logs:** Rotated daily, archived monthly

**Recovery Procedures:**
1. **Service Recovery:** Restart → Health checks → Monitor
2. **Database Recovery:** Supabase restoration → Verify integrity → Test
3. **Full System Recovery:** Redeploy → Restore config → Validate

### 6.7 Incident Response

**Severity Levels:**

**Severity 1 - Critical (System Down):**
- Response Time: 15 minutes
- Examples: Complete outage, data loss
- Actions: Immediate escalation

**Severity 2 - High (Major Functionality Impaired):**
- Response Time: 1 hour
- Examples: Email processing failures, API errors
- Actions: Assign to development team

**Severity 3 - Medium (Minor Issues):**
- Response Time: 4 hours
- Examples: Performance degradation, UI issues
- Actions: Standard support queue

**Severity 4 - Low (Enhancement Requests):**
- Response Time: Next business day
- Examples: Feature requests, documentation
- Actions: Product backlog

---

## Summary

This comprehensive guide covers the complete setup and deployment process for the Investra AI project, including:

- **Database-driven configuration** eliminating environment variable issues
- **Secure API key management** through encrypted database storage
- **Robust CI/CD pipeline** with quality gates and automated testing
- **Production-ready deployment** with health monitoring
- **Comprehensive monitoring** with Sentry integration
- **Maintenance procedures** for ongoing system health

The system is designed to be self-contained, reliable, and easily maintainable through the web interface, with all settings managed through the database rather than environment variables.

**Key Benefits:**
- ✅ No more environment variable deployment issues
- ✅ All settings configurable through web UI
- ✅ Encrypted storage for sensitive data
- ✅ Real-time configuration updates
- ✅ Centralized configuration management
- ✅ Comprehensive monitoring and alerting
- ✅ Automated quality assurance
- ✅ Reliable backup and recovery procedures