# Unified Investra Platform Deployment Guide

## Overview

This guide documents the new unified deployment system that consolidates and optimizes the Investra platform deployment process, eliminating the conflicts and redundancies that existed between the previous `deploy.yml` and `deploy-email-api.yml` workflows.

## Key Improvements

### ✅ **Conflicts Resolved**
- **Port Conflicts**: Environment-specific port allocation (Production: 3001, Staging: 3002, Development: 3003)
- **Service Management**: Clear separation between systemd and PM2 deployment modes
- **Deployment Paths**: Organized directory structure under `/opt/investra/email-api/`
- **Workflow Triggers**: Single unified workflow prevents simultaneous deployments

### ✅ **Redundancy Eliminated**
- **Environment Configuration**: Centralized configuration management with `deployment-config.json`
- **Secret Validation**: Unified secret validation script
- **Authentication Middleware**: Fixed loading and deployment issues
- **Build Process**: Single build pipeline for all components

## Architecture

### **Deployment Structure**
```
/opt/investra/
├── email-api/
│   ├── production/     # Port 3001, systemd service
│   ├── staging/        # Port 3002, systemd service  
│   └── development/    # Port 3003, PM2 or systemd
├── backups/            # Deployment backups
└── shared/             # Shared configurations
```

### **Port Allocation**
| Environment | API Port | WebSocket Port | Service Name |
|-------------|----------|----------------|--------------|
| Production  | 3001     | 3002          | investra-email-api-prod |
| Staging     | 3002     | 3003          | investra-email-api-staging |
| Development | 3003     | 3004          | investra-email-api-dev |

## Deployment Methods

### **1. GitHub Actions (Recommended)**

The unified workflow `.github/workflows/deploy-investra-platform.yml` provides:

#### **Automatic Deployment**
- Triggers on push to `main` branch
- Deploys to production environment
- Uses systemd service management

#### **Manual Deployment**
```yaml
# Workflow dispatch options:
- Environment: production|staging|development
- Deploy Frontend: true|false
- Deploy Email API: true|false  
- Deployment Mode: systemd|pm2
```

#### **Workflow Features**
- **Conflict Prevention**: Stops conflicting services before deployment
- **Configuration Validation**: Validates secrets and environment variables
- **Authentication Fix**: Ensures middleware is properly built and deployed
- **Comprehensive Verification**: Tests both frontend and API endpoints
- **Rollback Support**: Automatic cleanup on failure with rollback recommendations

### **2. Manual Deployment**

#### **Using Unified Script**
```bash
cd server

# Production deployment with systemd
./unified-deployment.sh deploy --env=production --mode=systemd

# Staging deployment with PM2
./unified-deployment.sh deploy --env=staging --mode=pm2

# Development deployment
./unified-deployment.sh deploy --env=development --mode=pm2
```

#### **Available Commands**
```bash
# Deployment operations
./unified-deployment.sh deploy --env=production --mode=systemd
./unified-deployment.sh status --env=production
./unified-deployment.sh restart --env=production
./unified-deployment.sh stop --env=production

# Maintenance operations
./unified-deployment.sh rollback --env=production
./unified-deployment.sh cleanup --env=production
./unified-deployment.sh health --env=production
```

## Configuration Management

### **Centralized Configuration**
The `server/deployment-config.json` file contains all environment-specific settings:

```json
{
  "environments": {
    "production": {
      "api_port": 3001,
      "deployment_mode": "systemd",
      "pm2_instances": 2,
      "ssl_enabled": true
    }
  },
  "shared_config": {
    "log_dir": "/var/log/investra",
    "backup_dir": "/opt/investra/backups"
  }
}
```

### **Environment Validation**
```bash
cd server

# Validate configuration for environment
./validate-deployment-config.sh validate production

# Generate environment file
./validate-deployment-config.sh generate production

# Check GitHub secrets
./validate-deployment-config.sh github
```

## Authentication Middleware

### **Fixed Issues**
- **Loading Problems**: Robust path resolution for middleware files
- **Build Integration**: Automatic building and deployment of authentication components
- **Environment Variables**: Proper Supabase configuration validation

### **Authentication Fix Script**
```bash
cd server

# Fix authentication middleware issues
./fix-auth-middleware.sh fix

# Check authentication status
./fix-auth-middleware.sh status

# Test authentication functionality
./fix-auth-middleware.sh test
```

## Service Management

### **Systemd (Production)**
- **Advantages**: Better stability, automatic startup, system integration
- **Configuration**: Automatic service file generation
- **Management**: Standard systemctl commands

```bash
# Service management
sudo systemctl status investra-email-api-prod
sudo systemctl restart investra-email-api-prod
sudo systemctl logs investra-email-api-prod
```

### **PM2 (Development/Staging)**
- **Advantages**: Development-friendly, easy process management
- **Configuration**: Environment-specific ecosystem files
- **Management**: PM2 commands

```bash
# PM2 management
pm2 status
pm2 restart investra-email-api-staging
pm2 logs investra-email-api-staging
```

## Monitoring and Verification

### **Health Checks**
- **Frontend**: `http://server-ip/health`
- **Email API**: `http://server-ip:port/health`
- **Authentication**: Proper error responses for auth endpoints

### **Verification Process**
1. **Service Status**: Check if services are running
2. **Port Availability**: Verify ports are properly allocated
3. **Health Endpoints**: Test application responsiveness
4. **Authentication**: Validate auth middleware functionality

### **Logs and Debugging**
```bash
# Application logs
tail -f /var/log/investra/investra-email-api-prod-combined.log

# System logs
sudo journalctl -u investra-email-api-prod -f

# PM2 logs
pm2 logs investra-email-api-staging --lines 50
```

## Rollback and Recovery

### **Automatic Backups**
- Created before each deployment
- Stored in `/opt/investra/backups/`
- Automatic cleanup (keeps last 5 backups)

### **Rollback Process**
```bash
# Rollback to previous deployment
./unified-deployment.sh rollback --env=production --mode=systemd

# Manual rollback
sudo systemctl stop investra-email-api-prod
sudo cp -r /opt/investra/backups/backup-YYYYMMDD-HHMMSS/* /opt/investra/email-api/production/
sudo systemctl start investra-email-api-prod
```

## Migration from Old Workflows

### **Deprecated Workflows**
- ❌ `.github/workflows/deploy.yml` (replaced)
- ❌ `.github/workflows/deploy-email-api.yml` (replaced)

### **Migration Steps**
1. **Update Secrets**: Ensure all required secrets are configured in GitHub
2. **Test Deployment**: Use manual workflow dispatch to test new system
3. **Remove Old Workflows**: Delete deprecated workflow files after successful testing
4. **Update Documentation**: Update any references to old deployment methods

## Troubleshooting

### **Common Issues**

#### **Port Conflicts**
```bash
# Check what's using a port
sudo netstat -tlnp | grep :3001
sudo ss -tlnp | grep :3001

# Kill processes using port
sudo fuser -k 3001/tcp
```

#### **Authentication Issues**
```bash
# Fix authentication middleware
cd server
./fix-auth-middleware.sh fix

# Check Supabase configuration
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

#### **Service Startup Issues**
```bash
# Check service status
sudo systemctl status investra-email-api-prod

# Check logs
sudo journalctl -u investra-email-api-prod --lines 50

# Test configuration
cd /opt/investra/email-api/production
node -c dist/standalone-enhanced-server-production.js
```

## Support

For deployment issues:
1. Check the deployment logs in GitHub Actions
2. Verify configuration with validation scripts
3. Use health check and status commands
4. Consider rollback if deployment fails
5. Review this guide for troubleshooting steps

The unified deployment system provides a robust, conflict-free deployment process with comprehensive error handling and recovery options.
