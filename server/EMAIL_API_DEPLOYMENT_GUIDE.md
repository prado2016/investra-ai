# Email API Server Deployment - Complete Setup

## Overview
This document outlines the complete GitHub Actions workflow and deployment scripts for the Investra Email API Server. The system handles TypeScript compilation, PM2 process management, Nginx reverse proxy, and multi-environment deployments.

## Architecture

### Components
1. **TypeScript API Server** - Main application in `/server` directory
2. **PM2 Process Manager** - Handles clustering and process monitoring
3. **Nginx Reverse Proxy** - Load balancing and SSL termination
4. **GitHub Actions Workflow** - Automated CI/CD pipeline
5. **Deployment Script** - Comprehensive deployment automation

### Environment Support
- **Production** - Port 3001, 2 PM2 instances, full monitoring
- **Staging** - Port 3002, 1 PM2 instance, reduced logging
- **Development** - Port 3003, 1 PM2 instance, debug mode

## Files Created

### 1. GitHub Actions Workflow
**File**: `/.github/workflows/deploy-email-api.yml`

**Features**:
- Multi-environment deployment (production/staging/development)
- Automatic environment detection from branch names
- Secret management for email and database credentials
- Self-hosted runner support
- Comprehensive error handling and verification

**Triggers**:
- Push to main/master/develop/staging branches
- Changes to `/server` directory
- Manual workflow dispatch with environment selection

### 2. Deployment Script
**File**: `/server/deploy-api-server.sh`

**Features**:
- Complete automated deployment process
- TypeScript compilation and build verification
- PM2 ecosystem configuration generation
- Nginx reverse proxy setup
- Environment-specific configuration
- Backup and rollback capabilities
- Health monitoring setup
- Permission and user management

**Commands**:
```bash
# Full deployment
./deploy-api-server.sh deploy

# Build only
./deploy-api-server.sh build

# Start/stop/restart
./deploy-api-server.sh start|stop|restart

# Status and logs
./deploy-api-server.sh status|logs
```

## Deployment Process

### 1. Environment Detection
The workflow automatically detects the target environment:
- `main/master` → Production
- `staging` → Staging
- `develop/development` → Development
- Manual dispatch → User choice

### 2. Configuration Generation
Each environment gets specific configuration:
- **API Port**: 3001 (prod), 3002 (staging), 3003 (dev)
- **Service Name**: Environment-specific naming
- **PM2 Instances**: 2 (prod), 1 (staging/dev)
- **Log Levels**: Optimized per environment

### 3. Build Process
1. Node.js setup with correct version
2. Dependency installation with `npm ci`
3. TypeScript compilation with `npm run build`
4. Build verification and error checking

### 4. Deployment Steps
1. **System Dependencies**: Node.js, PM2, TypeScript
2. **User/Directory Setup**: Service user, permissions, directories
3. **Application Build**: TypeScript compilation and verification
4. **Environment Config**: Environment-specific .env files
5. **PM2 Configuration**: Process management setup
6. **Deployment**: File copying with backup creation
7. **Service Start**: PM2 cluster startup
8. **Proxy Setup**: Nginx reverse proxy configuration
9. **Verification**: Health checks and connectivity tests
10. **Monitoring**: Automated health monitoring setup

## Configuration

### Environment Variables
The deployment uses the following secrets (configure in GitHub repository settings):

**Email Configuration**:
- `EMAIL_HOST` - SMTP server hostname
- `EMAIL_PORT` - SMTP server port
- `EMAIL_USER` - SMTP username
- `EMAIL_PASSWORD` - SMTP password

**IMAP Configuration**:
- `IMAP_HOST` - IMAP server hostname
- `IMAP_PORT` - IMAP server port
- `IMAP_USER` - IMAP username
- `IMAP_PASSWORD` - IMAP password

**Database Configuration**:
- `DATABASE_URL` - Database connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service role key

### PM2 Ecosystem Configuration
Each environment gets a tailored PM2 configuration:

```javascript
module.exports = {
  apps: [{
    name: 'investra-email-api-prod',
    script: 'dist/simple-production-server.js',
    instances: 2,
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    // ... environment-specific settings
  }]
};
```

### Nginx Configuration
Automatic reverse proxy setup:

```nginx
upstream investra-email-api-prod {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name api-production.investra.com;
    
    location / {
        proxy_pass http://investra-email-api-prod;
        # ... proxy headers and settings
    }
}
```

## Directory Structure

### Production Layout
```
/opt/investra/
├── email-api-prod/          # Production application
├── email-api-staging/       # Staging application
├── email-api-dev/          # Development application
├── backups/                 # Automated backups
└── monitor-*.sh            # Monitoring scripts

/var/log/investra/
├── *-combined.log          # Application logs
├── *-out.log              # stdout logs
├── *-error.log            # stderr logs
└── monitor.log            # Monitoring logs
```

## Monitoring & Health Checks

### Automated Monitoring
- **Health Check Endpoint**: `/health` on each API instance
- **Process Monitoring**: PM2 process status checks
- **Automated Restart**: Failed processes automatically restarted
- **Cron Job**: 5-minute interval health checks
- **Logging**: All monitoring activities logged

### Manual Monitoring Commands
```bash
# PM2 status
pm2 list

# Application logs
pm2 logs investra-email-api-prod

# Real-time monitoring
pm2 monit

# Health check
curl http://localhost:3001/health
```

## Security Features

### User Management
- **Service User**: Dedicated `investra` user for running services
- **File Permissions**: Restricted access to application files
- **Process Isolation**: PM2 runs under service user

### Network Security
- **Firewall Configuration**: Automatic port opening for API endpoints
- **Reverse Proxy**: Nginx handles external connections
- **Internal Communication**: Direct API access restricted to localhost

## Backup & Recovery

### Automatic Backups
- **Pre-deployment**: Automatic backup before each deployment
- **Timestamped**: Backups include date/time in filename
- **Location**: `/opt/investra/backups/`
- **Retention**: Manual cleanup (can be automated)

### Rollback Process
```bash
# Stop current version
pm2 stop investra-email-api-prod

# Restore from backup
sudo cp -r /opt/investra/backups/backup-YYYYMMDD-HHMMSS/* /opt/investra/email-api-prod/

# Restart service
pm2 start investra-email-api-prod
```

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check TypeScript compilation errors
   - Verify `dist/` directory creation
   - Review dependency installation logs

2. **PM2 Start Issues**:
   - Check PM2 configuration syntax
   - Verify file permissions
   - Review application logs

3. **Health Check Failures**:
   - Check if application is binding to correct port
   - Verify environment variables
   - Review application startup logs

4. **Nginx Proxy Issues**:
   - Test Nginx configuration: `nginx -t`
   - Check if application is responding locally
   - Verify firewall settings

### Log Locations
- **Application Logs**: `/var/log/investra/`
- **PM2 Logs**: `pm2 logs <service-name>`
- **Nginx Logs**: `/var/log/nginx/`
- **System Logs**: `journalctl -u nginx`

## Usage Examples

### Manual Deployment
```bash
# Full production deployment
cd /path/to/server
ENVIRONMENT=production ./deploy-api-server.sh deploy

# Staging deployment with custom port
ENVIRONMENT=staging API_PORT=3002 ./deploy-api-server.sh deploy
```

### GitHub Actions Deployment
1. **Automatic**: Push to main branch triggers production deployment
2. **Manual**: Use workflow dispatch to choose environment
3. **Staging**: Create PR or push to staging branch

### Service Management
```bash
# Check status
./deploy-api-server.sh status

# View logs
./deploy-api-server.sh logs

# Restart service
./deploy-api-server.sh restart
```

## Next Steps

1. **Configure GitHub Secrets**: Add all required environment variables
2. **DNS Setup**: Point `api-*.investra.com` to your server
3. **SSL Certificates**: Set up Let's Encrypt for HTTPS
4. **Monitoring Integration**: Connect to external monitoring services
5. **Load Testing**: Verify performance under load
6. **Backup Automation**: Set up automated backup retention

## Integration with Email Server

The API server deployment complements the email server deployment:
- **Email Server**: Handles SMTP/IMAP mail processing
- **API Server**: Provides REST API for email management
- **Shared Infrastructure**: Both use same server and monitoring

Both deployments can run simultaneously and complement each other for a complete email processing solution.

---

**Status**: ✅ Ready for deployment
**Version**: 1.0.0
**Last Updated**: June 17, 2025
