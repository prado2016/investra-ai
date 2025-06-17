#!/bin/bash

# Investra AI Email Processing API - Production Deployment Script
# Task 13.1: Deploy API Server to Production
# Complete production deployment with PM2 and systemd integration

set -euo pipefail

# Configuration
SERVICE_NAME="investra-email-api"
SERVICE_USER="investra"
SERVER_DIR="/opt/investra/email-api"
LOG_DIR="/var/log/investra"
NGINX_SITE_NAME="investra-email-api"
BACKUP_DIR="/opt/investra/backups"
CURRENT_USER=$(whoami)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        log_info "Usage: sudo ./production-deployment.sh"
        exit 1
    fi
}

# System preparation
prepare_system() {
    log "Preparing system for deployment..."
    
    # Update system packages
    log_info "Updating system packages..."
    apt-get update && apt-get upgrade -y
    
    # Install required packages
    log_info "Installing required packages..."
    apt-get install -y curl wget gnupg2 software-properties-common \
        build-essential git nginx certbot python3-certbot-nginx \
        logrotate fail2ban ufw htop iotop
    
    # Install Node.js 18 LTS
    log_info "Installing Node.js 18 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    # Install PM2 globally
    log_info "Installing PM2 globally..."
    npm install -g pm2@latest
    
    # Setup PM2 startup
    pm2 startup systemd -u $SERVICE_USER --hp /home/$SERVICE_USER
    
    log "System preparation completed"
}

# Create service user and directories
setup_user_and_directories() {
    log "Setting up service user and directories..."
    
    # Create service user if not exists
    if ! id "$SERVICE_USER" &>/dev/null; then
        log_info "Creating service user: $SERVICE_USER"
        useradd --system --home-dir "$SERVER_DIR" --create-home --shell /bin/bash "$SERVICE_USER"
    else
        log_info "Service user $SERVICE_USER already exists"
    fi
    
    # Create required directories
    log_info "Creating directories..."
    mkdir -p "$SERVER_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "/etc/nginx/sites-available"
    mkdir -p "/etc/nginx/sites-enabled"
    
    # Set permissions
    chown -R "$SERVICE_USER:$SERVICE_USER" "$SERVER_DIR"
    chown -R "$SERVICE_USER:$SERVICE_USER" "$LOG_DIR"
    chown -R "$SERVICE_USER:$SERVICE_USER" "$BACKUP_DIR"
    chmod 755 "$SERVER_DIR"
    chmod 755 "$LOG_DIR"
    chmod 755 "$BACKUP_DIR"
    
    log "User and directories setup completed"
}

# Deploy application files
deploy_application() {
    log "Deploying application files..."
    
    # Copy source files to production directory
    log_info "Copying application files..."
    cp -r ./* "$SERVER_DIR/"
    
    # Set ownership
    chown -R "$SERVICE_USER:$SERVICE_USER" "$SERVER_DIR"
    
    # Switch to service user for npm operations
    log_info "Installing dependencies..."
    sudo -u "$SERVICE_USER" bash -c "cd $SERVER_DIR && npm install --production"
    
    # Build TypeScript
    log_info "Building TypeScript..."
    sudo -u "$SERVICE_USER" bash -c "cd $SERVER_DIR && npm run build"
    
    # Copy ecosystem configuration
    if [[ -f "ecosystem.config.js" ]]; then
        cp ecosystem.config.js "$SERVER_DIR/"
        chown "$SERVICE_USER:$SERVICE_USER" "$SERVER_DIR/ecosystem.config.js"
    fi
    
    # Copy environment file
    if [[ -f ".env.production" ]]; then
        cp .env.production "$SERVER_DIR/"
        chown "$SERVICE_USER:$SERVICE_USER" "$SERVER_DIR/.env.production"
        chmod 600 "$SERVER_DIR/.env.production"
    fi
    
    log "Application deployment completed"
}

# Configure Nginx reverse proxy
setup_nginx() {
    log "Setting up Nginx reverse proxy..."
    
    # Copy nginx configuration
    if [[ -f "nginx-config.conf" ]]; then
        log_info "Installing Nginx configuration..."
        cp nginx-config.conf "/etc/nginx/sites-available/$NGINX_SITE_NAME"
        
        # Enable site
        ln -sf "/etc/nginx/sites-available/$NGINX_SITE_NAME" "/etc/nginx/sites-enabled/"
        
        # Remove default site if exists
        rm -f /etc/nginx/sites-enabled/default
        
        # Test nginx configuration
        log_info "Testing Nginx configuration..."
        nginx -t
        
        # Reload nginx
        systemctl reload nginx
        
        log "Nginx configuration completed"
    else
        log_warn "nginx-config.conf not found, skipping Nginx setup"
    fi
}

# Configure SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    # Check if domain is accessible
    read -p "Enter your domain name (e.g., api.investra.com): " DOMAIN_NAME
    
    if [[ -n "$DOMAIN_NAME" ]]; then
        log_info "Requesting SSL certificate for $DOMAIN_NAME..."
        
        # Request certificate
        certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos \
            --email "admin@investra.com" --redirect
        
        # Setup auto-renewal
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
        
        log "SSL certificates configured for $DOMAIN_NAME"
    else
        log_warn "No domain provided, skipping SSL setup"
    fi
}

# Configure PM2 process management
setup_pm2() {
    log "Setting up PM2 process management..."
    
    # Switch to service user
    sudo -u "$SERVICE_USER" bash -c "
        cd $SERVER_DIR
        
        # Stop any existing processes
        pm2 delete all 2>/dev/null || true
        
        # Start applications using ecosystem file
        pm2 start ecosystem.config.js --env production
        
        # Save PM2 configuration
        pm2 save
        
        # Setup startup script
        pm2 startup systemd -u $SERVICE_USER --hp /home/$SERVICE_USER
    "
    
    # Enable and start PM2 service
    systemctl enable pm2-$SERVICE_USER
    systemctl start pm2-$SERVICE_USER
    
    log "PM2 process management configured"
}

# Configure firewall
setup_firewall() {
    log "Configuring firewall..."
    
    # Reset UFW
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow API port (if needed)
    ufw allow 3001/tcp
    
    # Enable firewall
    ufw --force enable
    
    log "Firewall configured"
}

# Configure log rotation
setup_log_rotation() {
    log "Setting up log rotation..."
    
    cat > /etc/logrotate.d/investra-email-api << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $SERVICE_USER $SERVICE_USER
    postrotate
        /bin/kill -USR1 \$(cat /var/run/pm2-$SERVICE_USER.pid) 2>/dev/null || true
    endscript
}
EOF
    
    log "Log rotation configured"
}

# Configure monitoring and health checks
setup_monitoring() {
    log "Setting up monitoring and health checks..."
    
    # Create health check script
    cat > /usr/local/bin/investra-health-check.sh << 'EOF'
#!/bin/bash

API_URL="http://localhost:3001/health"
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" || echo "000")

if [[ "$STATUS_CODE" == "200" ]]; then
    echo "API Health Check: OK"
    exit 0
else
    echo "API Health Check: FAILED (HTTP $STATUS_CODE)"
    exit 1
fi
EOF
    
    chmod +x /usr/local/bin/investra-health-check.sh
    
    # Setup cron job for health monitoring
    echo "*/5 * * * * /usr/local/bin/investra-health-check.sh >> /var/log/investra/health-check.log 2>&1" | crontab -u "$SERVICE_USER" -
    
    log "Monitoring setup completed"
}

# Backup and recovery setup
setup_backup() {
    log "Setting up backup and recovery..."
    
    # Create backup script
    cat > /usr/local/bin/investra-backup.sh << EOF
#!/bin/bash

BACKUP_DIR="$BACKUP_DIR"
DATE=\$(date +%Y%m%d_%H%M%S)
APP_BACKUP="\$BACKUP_DIR/app_backup_\$DATE.tar.gz"

# Create application backup
tar -czf "\$APP_BACKUP" -C "$SERVER_DIR" . --exclude=node_modules --exclude=dist

# Keep only last 7 backups
find "\$BACKUP_DIR" -name "app_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: \$APP_BACKUP"
EOF
    
    chmod +x /usr/local/bin/investra-backup.sh
    
    # Setup daily backup cron job
    echo "0 2 * * * /usr/local/bin/investra-backup.sh >> /var/log/investra/backup.log 2>&1" | crontab -
    
    log "Backup setup completed"
}

# Validate deployment
validate_deployment() {
    log "Validating deployment..."
    
    # Check if services are running
    log_info "Checking system services..."
    systemctl is-active --quiet nginx && log_info "✓ Nginx is running" || log_error "✗ Nginx is not running"
    systemctl is-active --quiet pm2-$SERVICE_USER && log_info "✓ PM2 is running" || log_error "✗ PM2 is not running"
    
    # Check PM2 processes
    log_info "Checking PM2 processes..."
    sudo -u "$SERVICE_USER" pm2 list
    
    # Test API endpoints
    log_info "Testing API endpoints..."
    sleep 5 # Give services time to start
    
    if curl -f -s "http://localhost:3001/health" > /dev/null; then
        log_info "✓ Health endpoint is responding"
    else
        log_error "✗ Health endpoint is not responding"
    fi
    
    # Check logs for errors
    log_info "Checking recent logs for errors..."
    tail -n 20 "$LOG_DIR/email-api-error.log" 2>/dev/null || log_info "No error logs found"
    
    log "Deployment validation completed"
}

# Display final information
show_deployment_info() {
    log "Deployment Summary:"
    echo "================================"
    echo "Service Name: $SERVICE_NAME"
    echo "Service User: $SERVICE_USER"
    echo "Application Directory: $SERVER_DIR"
    echo "Log Directory: $LOG_DIR"
    echo "API Port: 3001"
    echo "Health Check: http://localhost:3001/health"
    echo "PM2 Status: sudo -u $SERVICE_USER pm2 status"
    echo "Logs: sudo -u $SERVICE_USER pm2 logs"
    echo "Restart: sudo -u $SERVICE_USER pm2 restart all"
    echo "================================"
    
    log "🎉 Production deployment completed successfully!"
    log_info "Next steps:"
    echo "  1. Update DNS records to point to this server"
    echo "  2. Configure environment variables in $SERVER_DIR/.env.production"
    echo "  3. Set up external monitoring (e.g., Uptime Robot, Pingdom)"
    echo "  4. Run end-to-end tests"
    echo "  5. Configure backup destination (e.g., S3, rsync)"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    # Add any cleanup tasks here
}

# Error handling
handle_error() {
    log_error "Deployment failed on line $1"
    cleanup
    exit 1
}

trap 'handle_error $LINENO' ERR

# Main deployment function
main() {
    log "🚀 Starting Investra AI Email Processing API Production Deployment"
    log "Script started by: $CURRENT_USER"
    log "Target directory: $SERVER_DIR"
    log "Target user: $SERVICE_USER"
    
    # Deployment steps
    check_root
    prepare_system
    setup_user_and_directories
    deploy_application
    setup_nginx
    setup_pm2
    setup_firewall
    setup_log_rotation
    setup_monitoring
    setup_backup
    validate_deployment
    
    # Optional SSL setup
    read -p "Do you want to set up SSL certificates? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_ssl
    fi
    
    show_deployment_info
    cleanup
}

# Run main function
main "$@"