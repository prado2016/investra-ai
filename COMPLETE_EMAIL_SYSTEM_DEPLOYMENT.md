# Investra AI - Complete Email System Deployment Summary

## Overview
Your Investra AI workspace now has complete GitHub Actions workflows for deploying both the **Email Server** and **Email API Server** components. This document provides a comprehensive overview of the entire system.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Investra AI Email System                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │   Email Server  │    │   API Server    │                    │
│  │   (Docker/      │    │   (PM2/Node.js) │                    │
│  │    Podman)      │    │                 │                    │
│  └─────────────────┘    └─────────────────┘                    │
│           │                       │                            │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ SMTP/IMAP Ports │    │   REST API      │                    │
│  │ 25, 587, 993    │    │   Port 3001+    │                    │
│  └─────────────────┘    └─────────────────┘                    │
│           │                       │                            │
│  ┌─────────────────────────────────────────┐                   │
│  │            Nginx Reverse Proxy          │                   │
│  │     mail.investra.com + api-*.com       │                   │
│  └─────────────────────────────────────────┘                   │
│                           │                                    │
│  ┌─────────────────────────────────────────┐                   │
│  │         RHEL/CentOS Self-Hosted         │                   │
│  │              GitHub Runner              │                   │
│  └─────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Components

### 1. Email Server (Docker/Podman)
**Location**: `/email-server/`
**Workflow**: `/.github/workflows/deploy-email-server.yml`
**Deployment Script**: `/email-server/start-mailserver.sh`

**Features**:
- Docker Mailserver with SSL certificates
- Podman Compose compatibility fixes
- Multi-environment support (prod/staging/dev)
- Automatic SSL certificate generation (Let's Encrypt + self-signed fallback)
- Email account management
- Security and firewall configuration

**Ports**:
- 25 (SMTP)
- 587 (SMTP Submission)
- 993 (IMAPS)
- 143 (IMAP)

### 2. Email API Server (Node.js/TypeScript)
**Location**: `/server/`
**Workflow**: `/.github/workflows/deploy-email-api.yml`
**Deployment Script**: `/server/deploy-api-server.sh`

**Features**:
- TypeScript compilation and build process
- PM2 process management with clustering
- Environment-specific configuration
- Nginx reverse proxy setup
- Health monitoring and automatic restart
- Database integration (Supabase)

**Ports**:
- 3001 (Production API)
- 3002 (Staging API)
- 3003 (Development API)

## GitHub Actions Workflows

### 1. Email Server Deployment
**File**: `/.github/workflows/deploy-email-server.yml`

**Triggers**:
- Push to `main`, `master`, `develop`, `staging` branches
- Changes to `/email-server/**` files
- Manual workflow dispatch

**Key Steps**:
1. Environment detection
2. System dependencies installation
3. SSL certificate setup (improved with fallbacks)
4. Email server configuration
5. Podman Compose deployment (with compatibility fixes)
6. Connectivity testing
7. Monitoring setup

### 2. Email API Deployment
**File**: `/.github/workflows/deploy-email-api.yml`

**Triggers**:
- Push to `main`, `master`, `develop`, `staging` branches
- Changes to `/server/**` files
- Manual workflow dispatch

**Key Steps**:
1. Environment detection
2. Node.js setup and dependencies
3. TypeScript compilation
4. PM2 configuration generation
5. Application deployment
6. Nginx proxy configuration
7. Health verification
8. Monitoring setup

## Environment Configuration

### Production
```yaml
Email Server:
  hostname: mail.investra.com
  ports: 25, 587, 993, 143

API Server:
  hostname: api-production.investra.com
  port: 3001
  instances: 2 (PM2 cluster)
```

### Staging
```yaml
Email Server:
  hostname: mail-staging.investra.com
  ports: 25, 587, 993, 143

API Server:
  hostname: api-staging.investra.com
  port: 3002
  instances: 1 (PM2 cluster)
```

### Development
```yaml
Email Server:
  hostname: mail-dev.investra.com
  ports: 25, 587, 993, 143

API Server:
  hostname: api-development.investra.com
  port: 3003
  instances: 1 (PM2 cluster)
```

## Required GitHub Secrets

### Email Server Secrets
- `ADMIN_EMAIL` - Administrator email for SSL certificates
- `EMAIL_PASSWORD` - Password for email accounts
- `STAGING_EMAIL_PASSWORD` - Staging environment password
- `DEV_EMAIL_PASSWORD` - Development environment password

### API Server Secrets
- `EMAIL_HOST` - SMTP server hostname
- `EMAIL_PORT` - SMTP server port
- `EMAIL_USER` - SMTP username
- `EMAIL_PASSWORD` - SMTP password
- `IMAP_HOST` - IMAP server hostname
- `IMAP_PORT` - IMAP server port
- `IMAP_USER` - IMAP username
- `IMAP_PASSWORD` - IMAP password
- `DATABASE_URL` - Database connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service role key

## Deployment Scripts

### Email Server Script
**File**: `/email-server/start-mailserver.sh`

**Features**:
- Podman Compose compatibility detection
- Automatic installation of missing dependencies
- SSL certificate verification
- Container lifecycle management
- Health monitoring setup

**Usage**:
```bash
# Full deployment
./start-mailserver.sh auto

# Test connectivity only
./start-mailserver.sh test

# Stop containers
./start-mailserver.sh stop
```

### API Server Script
**File**: `/server/deploy-api-server.sh`

**Features**:
- Environment detection and configuration
- TypeScript build process
- PM2 ecosystem management
- Nginx reverse proxy setup
- Health monitoring and automatic restart

**Usage**:
```bash
# Full deployment
ENVIRONMENT=production ./deploy-api-server.sh deploy

# Build only
./deploy-api-server.sh build

# Service management
./deploy-api-server.sh start|stop|restart|status|logs
```

## Key Improvements Made

### 1. SSL Certificate Setup Fix
**Problem**: GitHub Actions failing with `epel-release` and `certbot` installation errors
**Solution**: 
- Enhanced SSL setup script with multiple distribution support
- Graceful fallbacks to self-signed certificates
- Multiple package manager support (DNF, YUM, APT, Snap)

### 2. Podman Compose Compatibility Fix
**Problem**: `exec format error` when using external docker-compose binary
**Solution**:
- Smart compose command detection
- Automatic installation of podman-compose
- Multiple fallback mechanisms
- Proper environment setup for Podman

### 3. Multi-Environment Support
**Enhancement**: Automatic environment detection and configuration
- Branch-based environment mapping
- Environment-specific ports and configurations
- Separate service instances for each environment

### 4. Comprehensive Error Handling
**Enhancement**: Robust error handling and recovery
- Graceful degradation when components fail
- Detailed logging and diagnostics
- Backup and rollback capabilities

## Directory Structure on Server

```
/opt/investra/
├── email-api-prod/          # Production API
├── email-api-staging/       # Staging API  
├── email-api-dev/          # Development API
├── backups/                # Automated backups
└── monitor-*.sh           # Monitoring scripts

/var/log/investra/
├── *-combined.log         # Application logs
├── *-out.log             # stdout logs
├── *-error.log           # stderr logs
└── monitor.log           # Monitoring logs

/etc/nginx/conf.d/
├── investra-email-api-prod.conf
├── investra-email-api-staging.conf
└── investra-email-api-dev.conf
```

## Monitoring & Health Checks

### Automated Monitoring
- **Email Server**: Container health checks, port connectivity tests
- **API Server**: PM2 process monitoring, health endpoint checks
- **Nginx**: Reverse proxy status and connectivity
- **System**: Automated restart on failure, cron-based monitoring

### Manual Monitoring
```bash
# Email Server
podman ps
podman logs mailserver

# API Server
pm2 list
pm2 logs investra-email-api-prod
pm2 monit

# Health Checks
curl http://localhost:3001/health
curl http://api-production.investra.com/health
```

## Testing Scripts

### Email Server Tests
- `/email-server/test-ssl-setup.sh` - SSL certificate setup testing
- `/email-server/test-podman-compose-fix.sh` - Podman compatibility testing

### API Server Tests
- `/server/test-api-deployment.sh` - Deployment configuration testing

## Next Steps

### 1. Configure GitHub Repository
1. **Add Secrets**: Configure all required environment variables in GitHub repository settings
2. **Set up Self-Hosted Runner**: Ensure RHEL/CentOS runner has necessary permissions
3. **DNS Configuration**: Point domains to your server IP

### 2. Initial Deployment
1. **Test Email Server**: Push changes to trigger email server deployment
2. **Test API Server**: Push changes to trigger API server deployment
3. **Verify Integration**: Test email processing through API endpoints

### 3. SSL and Security
1. **SSL Certificates**: Ensure Let's Encrypt certificates are properly generated
2. **Firewall Rules**: Verify all necessary ports are open
3. **Security Hardening**: Review and implement additional security measures

### 4. Monitoring and Maintenance
1. **Log Monitoring**: Set up log aggregation and alerting
2. **Performance Monitoring**: Monitor resource usage and performance
3. **Backup Strategy**: Implement automated backup retention policies

## Quick Start Commands

### Deploy Email Server
```bash
# Manual deployment
cd email-server
ADMIN_EMAIL="admin@investra.com" \
HOSTNAME="mail.investra.com" \
./setup-ssl.sh auto && ./start-mailserver.sh auto
```

### Deploy API Server
```bash
# Manual deployment
cd server
ENVIRONMENT=production \
EMAIL_HOST="mail.investra.com" \
EMAIL_USER="transactions@investra.com" \
./deploy-api-server.sh deploy
```

### GitHub Actions Deployment
1. Push to `main` branch for production deployment
2. Push to `staging` branch for staging deployment
3. Use workflow dispatch for manual environment selection

## Status

✅ **Email Server Deployment**: Complete with SSL and Podman fixes
✅ **API Server Deployment**: Complete with PM2 and Nginx setup
✅ **GitHub Actions Workflows**: Configured for both components
✅ **Multi-Environment Support**: Production, Staging, Development
✅ **Error Handling**: Comprehensive fallbacks and recovery
✅ **Monitoring**: Automated health checks and restart capabilities
✅ **Documentation**: Complete setup and troubleshooting guides

**System Status**: Ready for production deployment

**Last Updated**: June 17, 2025
