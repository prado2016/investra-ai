#!/bin/bash

# Unified Investra Platform Deployment Script
# Consolidates email server deployment logic from both systemd and PM2 approaches
# Eliminates port conflicts and service management conflicts

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${ENVIRONMENT:-production}"
DEPLOYMENT_MODE="${DEPLOYMENT_MODE:-systemd}"  # systemd or pm2
LOG_DIR="/var/log/investra"
BACKUP_DIR="/opt/investra/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"; }
log_error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"; }
log_info() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"; }

# Environment-specific configuration with proper port allocation
configure_environment() {
    log "🔍 Configuring environment: $ENVIRONMENT"
    
    case "$ENVIRONMENT" in
        production)
            API_PORT="3001"
            WS_PORT="3002"
            SERVICE_NAME="investra-email-api-prod"
            SERVER_DIR="/opt/investra/email-api/production"
            PM2_INSTANCES=2
            ;;
        staging)
            API_PORT="3002"
            WS_PORT="3003"
            SERVICE_NAME="investra-email-api-staging"
            SERVER_DIR="/opt/investra/email-api/staging"
            PM2_INSTANCES=1
            ;;
        development)
            API_PORT="3003"
            WS_PORT="3004"
            SERVICE_NAME="investra-email-api-dev"
            SERVER_DIR="/opt/investra/email-api/development"
            PM2_INSTANCES=1
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    log "✅ Environment configured:"
    log "   Service: $SERVICE_NAME"
    log "   API Port: $API_PORT"
    log "   WebSocket Port: $WS_PORT"
    log "   Directory: $SERVER_DIR"
    log "   Deployment Mode: $DEPLOYMENT_MODE"
}

# Comprehensive port conflict resolution
resolve_port_conflicts() {
    log "🔧 Resolving port conflicts for port $API_PORT..."
    
    # Stop any existing services using the target port
    local port_users
    port_users=$(netstat -tlnp 2>/dev/null | grep ":$API_PORT " || ss -tlnp 2>/dev/null | grep ":$API_PORT " || echo "")
    
    if [ -n "$port_users" ]; then
        log_warn "Port $API_PORT is in use, stopping conflicting services..."
        
        # Stop systemd services
        sudo systemctl stop investra-email-server 2>/dev/null || true
        sudo systemctl stop "$SERVICE_NAME" 2>/dev/null || true
        
        # Stop PM2 processes
        if command -v pm2 >/dev/null 2>&1; then
            pm2 stop all 2>/dev/null || true
            pm2 delete all 2>/dev/null || true
        fi
        
        # Kill remaining processes using the port
        sudo fuser -k "$API_PORT/tcp" 2>/dev/null || true
        
        # Wait for port to be freed
        sleep 3
        
        # Verify port is free
        if netstat -tlnp 2>/dev/null | grep ":$API_PORT " || ss -tlnp 2>/dev/null | grep ":$API_PORT "; then
            log_error "Failed to free port $API_PORT"
            exit 1
        fi
    fi
    
    log "✅ Port $API_PORT is available"
}

# Build application
build_application() {
    log "🔨 Building application..."
    
    cd "$SCRIPT_DIR"
    
    # Install dependencies
    npm ci --include=dev
    
    # Build TypeScript
    npm run build
    
    # Verify build
    if [ ! -f "dist/standalone-enhanced-server-production.js" ]; then
        log_error "Build failed - standalone server not found"
        exit 1
    fi
    
    log "✅ Application built successfully"
}

# Create unified environment configuration
create_environment_config() {
    log "⚙️ Creating unified environment configuration..."
    
    cd "$SCRIPT_DIR"
    
    # Validate critical environment variables
    if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
        log_error "Critical Supabase environment variables missing!"
        log_error "SUPABASE_URL: ${SUPABASE_URL:-'NOT SET'}"
        log_error "SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:20}... (truncated)"
        exit 1
    fi
    
    # Create environment file
    ENV_FILE=".env.${ENVIRONMENT}"
    cat > "$ENV_FILE" << EOF
NODE_ENV=${ENVIRONMENT}
PORT=${API_PORT}
WS_PORT=${WS_PORT}
LOG_LEVEL=${LOG_LEVEL:-info}
LOG_DIR=${LOG_DIR}

# Email configuration
EMAIL_HOST=${EMAIL_HOST:-localhost}
EMAIL_PORT=${EMAIL_PORT:-587}
EMAIL_USER=${EMAIL_USER:-}
EMAIL_PASSWORD=${EMAIL_PASSWORD:-}
EMAIL_SECURE=${EMAIL_SECURE:-true}

# IMAP configuration
IMAP_HOST=${IMAP_HOST:-localhost}
IMAP_PORT=${IMAP_PORT:-993}
IMAP_USER=${IMAP_USER:-}
IMAP_PASSWORD=${IMAP_PASSWORD:-}
IMAP_SECURE=${IMAP_SECURE:-true}
IMAP_ENABLED=${IMAP_ENABLED:-true}

# Database configuration
DATABASE_URL=${DATABASE_URL:-}

# Supabase Configuration
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY:-}
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
EOF
    
    log "✅ Environment configuration created: $ENV_FILE"
}

# Setup directories and permissions
setup_directories() {
    log "📁 Setting up directories..."
    
    sudo mkdir -p "$SERVER_DIR" "$LOG_DIR" "$BACKUP_DIR"
    
    # Create investra user if needed
    if ! id "investra" &>/dev/null; then
        sudo useradd -r -s /bin/false investra
        log "✅ Created investra user"
    fi
    
    sudo chown -R investra:investra "$SERVER_DIR" "$LOG_DIR" "$BACKUP_DIR"
    log "✅ Directories configured"
}

# Deploy application files
deploy_application() {
    log "🚀 Deploying application to $SERVER_DIR..."
    
    # Create backup if existing deployment
    if [ -d "$SERVER_DIR" ] && [ "$(ls -A $SERVER_DIR)" ]; then
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        sudo cp -r "$SERVER_DIR" "$BACKUP_DIR/$BACKUP_NAME"
        log "💾 Backup created: $BACKUP_NAME"
    fi
    
    # Deploy new version
    sudo rm -rf "${SERVER_DIR:?}"/*
    sudo cp -r "$SCRIPT_DIR"/* "$SERVER_DIR/"
    sudo chown -R investra:investra "$SERVER_DIR"
    
    log "✅ Application deployed"
}

# Deploy with systemd (preferred for production stability)
deploy_with_systemd() {
    log "🔧 Deploying with systemd service..."

    cd "$SERVER_DIR"

    # Create systemd service file
    sudo tee "/etc/systemd/system/$SERVICE_NAME.service" > /dev/null << EOF
[Unit]
Description=Investra Enhanced Email API Server ($ENVIRONMENT)
After=network.target
Wants=network.target

[Service]
Type=simple
User=investra
Group=investra
WorkingDirectory=$SERVER_DIR
Environment=NODE_ENV=$ENVIRONMENT
Environment=PORT=$API_PORT
Environment=PATH=/usr/bin:/usr/local/bin
ExecStart=/usr/bin/node dist/standalone-enhanced-server-production.js
ExecStop=/bin/kill -TERM \$MAINPID
ExecStopPost=/bin/bash -c 'fuser -k $API_PORT/tcp || true'
Restart=on-failure
RestartSec=15
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=$SERVER_DIR $LOG_DIR /tmp
ProtectHome=yes

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and start service
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    sudo systemctl start "$SERVICE_NAME"

    # Wait for service to start
    sleep 5
    if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
        log "✅ Systemd service started successfully"
    else
        log_error "❌ Systemd service failed to start"
        sudo systemctl status "$SERVICE_NAME" --no-pager
        exit 1
    fi
}

# Deploy with PM2 (alternative for development/staging)
deploy_with_pm2() {
    log "🔧 Deploying with PM2..."

    # Install PM2 if not present
    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2
    fi

    cd "$SERVER_DIR"

    # Create PM2 ecosystem config
    cat > "ecosystem.$ENVIRONMENT.config.js" << EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME',
    script: 'dist/standalone-enhanced-server-production.js',
    cwd: '$SERVER_DIR',
    instances: $PM2_INSTANCES,
    exec_mode: 'cluster',
    env_file: '.env.$ENVIRONMENT',
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    log_file: '$LOG_DIR/$SERVICE_NAME-combined.log',
    out_file: '$LOG_DIR/$SERVICE_NAME-out.log',
    error_file: '$LOG_DIR/$SERVICE_NAME-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    kill_timeout: 5000,
    listen_timeout: 3000
  }]
};
EOF

    # Start with PM2
    pm2 start "ecosystem.$ENVIRONMENT.config.js" --update-env
    pm2 save

    # Verify startup
    sleep 5
    if pm2 list | grep -q "$SERVICE_NAME.*online"; then
        log "✅ PM2 service started successfully"
    else
        log_error "❌ PM2 service failed to start"
        pm2 logs "$SERVICE_NAME" --lines 20 --nostream
        exit 1
    fi
}

# Verify deployment
verify_deployment() {
    log "🔍 Verifying deployment..."

    # Test health endpoint
    local health_url="http://localhost:$API_PORT/health"
    local response

    for i in {1..10}; do
        if response=$(curl -f -s "$health_url" 2>/dev/null); then
            if echo "$response" | grep -q "healthy"; then
                log "✅ Health check passed: $response"
                return 0
            fi
        fi
        log "⏳ Waiting for service to be ready... ($i/10)"
        sleep 3
    done

    log_error "❌ Health check failed after 30 seconds"
    return 1
}

# Service management functions
show_status() {
    log "📊 Service Status:"
    case "$DEPLOYMENT_MODE" in
        systemd)
            sudo systemctl status "$SERVICE_NAME" --no-pager || true
            ;;
        pm2)
            pm2 list | grep "$SERVICE_NAME" || echo "Service not found"
            ;;
    esac
}

stop_service() {
    log "🛑 Stopping service..."
    case "$DEPLOYMENT_MODE" in
        systemd)
            sudo systemctl stop "$SERVICE_NAME"
            ;;
        pm2)
            pm2 stop "$SERVICE_NAME" || true
            ;;
    esac
}

restart_service() {
    log "🔄 Restarting service..."
    case "$DEPLOYMENT_MODE" in
        systemd)
            sudo systemctl restart "$SERVICE_NAME"
            ;;
        pm2)
            pm2 restart "$SERVICE_NAME"
            ;;
    esac
}

# Main deployment function
deploy() {
    log "🚀 Starting unified deployment..."

    configure_environment
    resolve_port_conflicts
    build_application
    create_environment_config
    setup_directories
    deploy_application

    # Choose deployment mode
    case "$DEPLOYMENT_MODE" in
        systemd)
            deploy_with_systemd
            ;;
        pm2)
            deploy_with_pm2
            ;;
        *)
            log_error "Unknown deployment mode: $DEPLOYMENT_MODE"
            exit 1
            ;;
    esac

    verify_deployment
    log "🎉 Deployment completed successfully!"
}

# Rollback to previous deployment
rollback_deployment() {
    log "🔄 Rolling back to previous deployment..."

    configure_environment

    # Find latest backup
    local latest_backup
    latest_backup=$(sudo find "$BACKUP_DIR" -name "backup-*" -type d | sort -r | head -1)

    if [ -z "$latest_backup" ]; then
        log_error "No backup found for rollback"
        return 1
    fi

    log "📦 Rolling back to: $(basename "$latest_backup")"

    # Stop current service
    stop_service

    # Restore backup
    sudo rm -rf "${SERVER_DIR:?}"/*
    sudo cp -r "$latest_backup"/* "$SERVER_DIR/"
    sudo chown -R investra:investra "$SERVER_DIR"

    # Start service
    case "$DEPLOYMENT_MODE" in
        systemd)
            sudo systemctl start "$SERVICE_NAME"
            ;;
        pm2)
            cd "$SERVER_DIR"
            pm2 start "ecosystem.$ENVIRONMENT.config.js"
            ;;
    esac

    # Verify rollback
    if verify_deployment; then
        log "✅ Rollback completed successfully"
        return 0
    else
        log_error "❌ Rollback verification failed"
        return 1
    fi
}

# Cleanup old backups
cleanup_backups() {
    log "🧹 Cleaning up old backups..."

    configure_environment

    # Keep last 5 backups
    local old_backups
    old_backups=$(sudo find "$BACKUP_DIR" -name "backup-*" -type d | sort -r | tail -n +6)

    if [ -n "$old_backups" ]; then
        echo "$old_backups" | while read -r backup; do
            log "🗑️ Removing old backup: $(basename "$backup")"
            sudo rm -rf "$backup"
        done
        log "✅ Old backups cleaned up"
    else
        log "ℹ️ No old backups to clean up"
    fi
}

# Health check with retry logic
health_check() {
    local max_attempts="${1:-10}"
    local retry_delay="${2:-3}"

    configure_environment

    log "🔍 Performing health check (max $max_attempts attempts)..."

    for i in $(seq 1 "$max_attempts"); do
        local health_url="http://localhost:$API_PORT/health"

        if response=$(curl -f -s "$health_url" 2>/dev/null); then
            if echo "$response" | grep -q "healthy"; then
                log "✅ Health check passed on attempt $i: $response"
                return 0
            fi
        fi

        if [ "$i" -lt "$max_attempts" ]; then
            log "⏳ Health check attempt $i failed, retrying in ${retry_delay}s..."
            sleep "$retry_delay"
        fi
    done

    log_error "❌ Health check failed after $max_attempts attempts"
    return 1
}

# Show usage
usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  deploy      Deploy the application"
    echo "  status      Show service status"
    echo "  stop        Stop the service"
    echo "  restart     Restart the service"
    echo "  rollback    Rollback to previous deployment"
    echo "  cleanup     Clean up old backups"
    echo "  health      Perform health check"
    echo ""
    echo "Options:"
    echo "  --env=ENV     Environment (production|staging|development)"
    echo "  --mode=MODE   Deployment mode (systemd|pm2)"
    echo ""
    echo "Examples:"
    echo "  $0 deploy --env=production --mode=systemd"
    echo "  $0 status --env=staging"
    echo "  $0 rollback --env=production"
    echo "  $0 health --env=production"
}

# Error handling with cleanup
cleanup_on_error() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Deployment failed with exit code $exit_code"
        log "🧹 Performing cleanup..."

        # Stop any partially started services
        case "$DEPLOYMENT_MODE" in
            systemd)
                sudo systemctl stop "$SERVICE_NAME" 2>/dev/null || true
                ;;
            pm2)
                pm2 stop "$SERVICE_NAME" 2>/dev/null || true
                pm2 delete "$SERVICE_NAME" 2>/dev/null || true
                ;;
        esac

        log "💡 Consider running: $0 rollback --env=$ENVIRONMENT --mode=$DEPLOYMENT_MODE"
    fi
    exit $exit_code
}

# Set up error handling
trap cleanup_on_error ERR

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env=*)
            ENVIRONMENT="${1#*=}"
            shift
            ;;
        --mode=*)
            DEPLOYMENT_MODE="${1#*=}"
            shift
            ;;
        deploy|status|stop|restart|rollback|cleanup|health)
            COMMAND="$1"
            shift
            ;;
        *)
            usage
            exit 1
            ;;
    esac
done

# Execute command
case "${COMMAND:-deploy}" in
    deploy)
        deploy
        ;;
    status)
        configure_environment
        show_status
        ;;
    stop)
        configure_environment
        stop_service
        ;;
    restart)
        configure_environment
        restart_service
        ;;
    rollback)
        rollback_deployment
        ;;
    cleanup)
        cleanup_backups
        ;;
    health)
        health_check
        ;;
    *)
        usage
        exit 1
        ;;
esac
