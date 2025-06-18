# Investra AI Email System - Quick Reference Guide

## 🚀 Quick Start

### Test Everything
```bash
# Run complete system test
./test-complete-system.sh

# Test specific components
./test-complete-system.sh email
./test-complete-system.sh api
./test-complete-system.sh workflows
```

### Manual Deployment

#### Email Server
```bash
cd email-server

# Setup SSL certificates
ADMIN_EMAIL="admin@investra.com" \
HOSTNAME="mail.investra.com" \
./setup-ssl.sh auto

# Start email server
./start-mailserver.sh auto

# Test connectivity
./start-mailserver.sh test
```

#### API Server
```bash
cd server

# Deploy production
ENVIRONMENT=production \
EMAIL_HOST="mail.investra.com" \
EMAIL_USER="transactions@investra.com" \
EMAIL_PASSWORD="your-password" \
./deploy-api-server.sh deploy

# Check status
./deploy-api-server.sh status

# View logs
./deploy-api-server.sh logs
```

### GitHub Actions Deployment

#### Automatic Triggers
- **Production**: Push to `main` or `master` branch
- **Staging**: Push to `staging` branch  
- **Development**: Push to `develop` or `development` branch

#### Manual Deployment
1. Go to GitHub repository → Actions
2. Select "Deploy Email Server" or "Deploy Email API Server"
3. Click "Run workflow"
4. Choose environment and branch
5. Click "Run workflow"

## 📋 System Status Commands

### Email Server
```bash
# Container status
podman ps

# Service logs
podman logs mailserver

# Health check
curl -I telnet://mail.investra.com:25
```

### API Server
```bash
# PM2 status
pm2 list

# Service logs
pm2 logs investra-email-api-prod

# Health check
curl http://localhost:3001/health
curl http://api-production.investra.com/health

# Real-time monitoring
pm2 monit
```

### System Services
```bash
# Nginx status
sudo systemctl status nginx

# Firewall status
sudo firewall-cmd --list-all

# Port usage
ss -tuln | grep -E ':(25|587|993|143|3001|3002|3003|80|443)'
```

## 🔧 Service Management

### Email Server
```bash
# Start
./start-mailserver.sh auto

# Stop
./start-mailserver.sh stop

# Restart
podman restart mailserver

# Update SSL certificates
./setup-ssl.sh auto
```

### API Server
```bash
# Start
./deploy-api-server.sh start

# Stop
./deploy-api-server.sh stop

# Restart
./deploy-api-server.sh restart

# Full redeploy
./deploy-api-server.sh deploy
```

## 🔍 Troubleshooting

### Email Server Issues

#### SSL Certificate Problems
```bash
# Check certificates
openssl x509 -in docker-data/dms/certs/mail.investra.com/fullchain.pem -noout -dates

# Regenerate certificates
rm -rf docker-data/dms/certs/
./setup-ssl.sh auto
```

#### Podman Compose Issues
```bash
# Check available compose commands
./start-mailserver.sh

# Install podman-compose
pip3 install --user podman-compose

# Reset Podman
podman system reset
```

#### Container Issues
```bash
# View container logs
podman logs --tail 50 mailserver

# Restart container
podman restart mailserver

# Full restart
./start-mailserver.sh stop
./start-mailserver.sh auto
```

### API Server Issues

#### Build Problems
```bash
# Clean build
rm -rf dist/ node_modules/
npm ci
npm run build
```

#### PM2 Issues
```bash
# Reset PM2
pm2 kill
pm2 resurrect

# Reload PM2 config
pm2 reload ecosystem.production.config.js
```

#### Port Conflicts
```bash
# Check port usage
ss -tuln | grep :3001

# Kill process using port
sudo fuser -k 3001/tcp

# Change port in environment
export API_PORT=3004
./deploy-api-server.sh deploy
```

### GitHub Actions Issues

#### Workflow Failures
1. Check GitHub Actions logs
2. Verify secrets are configured
3. Ensure self-hosted runner is online
4. Check runner permissions

#### Common Fixes
```bash
# Update runner
cd /path/to/actions-runner
./config.sh remove
./config.sh --url https://github.com/your-org/investra-ai --token YOUR_TOKEN
```

## 📊 Monitoring

### Health Endpoints
```bash
# API Server health
curl http://localhost:3001/health

# Email server connectivity
timeout 5 bash -c '</dev/tcp/localhost/25'
timeout 5 bash -c '</dev/tcp/localhost/587'
timeout 5 bash -c '</dev/tcp/localhost/993'
```

### Log Monitoring
```bash
# API Server logs
tail -f /var/log/investra/investra-email-api-prod-combined.log

# Email server logs
podman logs -f mailserver

# System logs
journalctl -f -u nginx
```

### Performance Monitoring
```bash
# PM2 monitoring
pm2 monit

# Container resources
podman stats mailserver

# System resources
htop
df -h
```

## 🔐 Security

### Firewall Management
```bash
# Check firewall rules
sudo firewall-cmd --list-all

# Add port
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload

# Remove port
sudo firewall-cmd --permanent --remove-port=3001/tcp
sudo firewall-cmd --reload
```

### SSL Certificate Management
```bash
# Check certificate expiry
openssl x509 -in /path/to/cert.pem -noout -dates

# Renew Let's Encrypt certificates
sudo certbot renew

# Update certificates in containers
sudo cp /etc/letsencrypt/live/mail.investra.com/* docker-data/dms/certs/mail.investra.com/
podman restart mailserver
```

## 📁 Important Paths

### Email Server
- **Configuration**: `~/investra-email-server/`
- **Data**: `~/investra-email-server/docker-data/dms/`
- **Certificates**: `~/investra-email-server/docker-data/dms/certs/`
- **Logs**: `podman logs mailserver`

### API Server
- **Production**: `/opt/investra/email-api-prod/`
- **Staging**: `/opt/investra/email-api-staging/`
- **Development**: `/opt/investra/email-api-dev/`
- **Logs**: `/var/log/investra/`
- **Backups**: `/opt/investra/backups/`

### System
- **Nginx Config**: `/etc/nginx/conf.d/`
- **SSL Certificates**: `/etc/letsencrypt/live/`
- **PM2 Config**: `~/.pm2/`

## 🔄 Backup & Recovery

### Create Backups
```bash
# Email server data
tar -czf email-server-backup-$(date +%Y%m%d).tar.gz ~/investra-email-server/docker-data/

# API server
sudo cp -r /opt/investra/email-api-prod /opt/investra/backups/manual-backup-$(date +%Y%m%d)

# Database (if applicable)
pg_dump investra_email > investra_email_backup_$(date +%Y%m%d).sql
```

### Restore from Backup
```bash
# Stop services
./start-mailserver.sh stop
pm2 stop all

# Restore data
tar -xzf email-server-backup-YYYYMMDD.tar.gz -C ~/investra-email-server/
sudo cp -r /opt/investra/backups/manual-backup-YYYYMMDD/* /opt/investra/email-api-prod/

# Restart services
./start-mailserver.sh auto
pm2 restart all
```

## 📞 Support Commands

### System Information
```bash
# OS version
cat /etc/os-release

# System resources
free -h
df -h
uptime

# Network configuration
ip addr show
hostname -I
```

### Service Status
```bash
# All services overview
./test-complete-system.sh

# Detailed status
echo "=== Email Server ==="
podman ps
echo "=== API Server ==="
pm2 list
echo "=== Nginx ==="
sudo systemctl status nginx
echo "=== Firewall ==="
sudo firewall-cmd --list-services
```

---

**Quick Help**: Run `./test-complete-system.sh` for comprehensive system status and troubleshooting guidance.
