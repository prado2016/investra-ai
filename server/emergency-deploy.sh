#!/bin/bash

# Emergency Deployment Script
# Quick recovery from failed GitHub Actions deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[EMERGENCY]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[EMERGENCY] WARNING:${NC} $1"; }
log_error() { echo -e "${RED}[EMERGENCY] ERROR:${NC} $1"; }
log_info() { echo -e "${BLUE}[EMERGENCY] INFO:${NC} $1"; }

# Configure environment
configure_environment() {
    case "$ENVIRONMENT" in
        production)
            API_PORT="3001"
            SERVICE_NAME="investra-email-api-prod"
            SERVER_DIR="/opt/investra/email-api/production"
            ;;
        staging)
            API_PORT="3002"
            SERVICE_NAME="investra-email-api-staging"
            SERVER_DIR="/opt/investra/email-api/staging"
            ;;
        development)
            API_PORT="3003"
            SERVICE_NAME="investra-email-api-dev"
            SERVER_DIR="/opt/investra/email-api/development"
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    log "🔧 Environment: $ENVIRONMENT"
    log "   API Port: $API_PORT"
    log "   Service: $SERVICE_NAME"
    log "   Directory: $SERVER_DIR"
}

# Emergency cleanup
emergency_cleanup() {
    log "🧹 Emergency cleanup..."
    
    configure_environment
    
    # Stop all conflicting services
    sudo systemctl stop investra-email-server 2>/dev/null || true
    sudo systemctl stop investra-email-api-prod 2>/dev/null || true
    sudo systemctl stop investra-email-api-staging 2>/dev/null || true
    sudo systemctl stop investra-email-api-dev 2>/dev/null || true
    
    # Stop PM2 processes
    if command -v pm2 &> /dev/null; then
        pm2 stop all 2>/dev/null || true
        pm2 delete all 2>/dev/null || true
        pm2 kill 2>/dev/null || true
    fi
    
    # Kill processes on common ports
    for port in 3001 3002 3003; do
        sudo fuser -k ${port}/tcp 2>/dev/null || true
    done
    
    sleep 5
    log "✅ Cleanup completed"
}

# Quick build
quick_build() {
    log "🔨 Quick build..."
    
    cd "$SCRIPT_DIR"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log "📦 Installing dependencies..."
        npm ci --include=dev
    fi
    
    # Build if needed
    if [ ! -f "dist/standalone-enhanced-server-production.js" ]; then
        log "🔧 Building application..."
        npm run build
    fi
    
    # Fix authentication middleware
    if [ -f "fix-auth-middleware.sh" ]; then
        chmod +x fix-auth-middleware.sh
        ./fix-auth-middleware.sh fix
    fi
    
    log "✅ Build completed"
}

# Emergency deployment
emergency_deploy() {
    log "🚀 Emergency deployment..."
    
    configure_environment
    emergency_cleanup
    quick_build
    
    # Create directories
    sudo mkdir -p "$SERVER_DIR" "/var/log/investra" "/opt/investra/backups"
    
    # Create investra user if needed
    if ! id "investra" &>/dev/null; then
        sudo useradd -r -s /bin/false investra
    fi
    
    # Deploy files
    sudo rm -rf "${SERVER_DIR:?}"/*
    sudo cp -r "$SCRIPT_DIR"/* "$SERVER_DIR/"
    sudo chown -R investra:investra "$SERVER_DIR"
    
    # Create environment file
    cat > "/tmp/.env.$ENVIRONMENT" << EOF
NODE_ENV=$ENVIRONMENT
PORT=$API_PORT
LOG_LEVEL=info
LOG_DIR=/var/log/investra

# Email configuration
EMAIL_HOST=${EMAIL_HOST:-localhost}
EMAIL_PORT=${EMAIL_PORT:-587}
EMAIL_USER=${EMAIL_USER:-test@investra.com}
EMAIL_PASSWORD=${EMAIL_PASSWORD:-placeholder}
EMAIL_SECURE=true

# IMAP configuration
IMAP_HOST=${IMAP_HOST:-localhost}
IMAP_PORT=${IMAP_PORT:-993}
IMAP_USER=${IMAP_USER:-test@investra.com}
IMAP_PASSWORD=${IMAP_PASSWORD:-placeholder}
IMAP_SECURE=true
IMAP_ENABLED=true

# Database configuration
DATABASE_URL=${DATABASE_URL:-}

# Supabase Configuration
SUPABASE_URL=${SUPABASE_URL:-https://ecbuwhpipphdssqjwgfm.supabase.co}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY:-}
VITE_SUPABASE_URL=${SUPABASE_URL:-https://ecbuwhpipphdssqjwgfm.supabase.co}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E}
EOF
    
    sudo mv "/tmp/.env.$ENVIRONMENT" "$SERVER_DIR/.env.$ENVIRONMENT"
    sudo chown investra:investra "$SERVER_DIR/.env.$ENVIRONMENT"
    
    # Create systemd service
    sudo tee "/etc/systemd/system/$SERVICE_NAME.service" > /dev/null << EOF
[Unit]
Description=Investra Enhanced Email API Server ($ENVIRONMENT)
After=network.target

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
Restart=on-failure
RestartSec=15
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF
    
    # Start service
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    sudo systemctl start "$SERVICE_NAME"
    
    # Wait and verify
    sleep 10
    
    if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
        log "✅ Service started successfully"
        
        # Test health endpoint
        for i in {1..5}; do
            if curl -f -s "http://localhost:$API_PORT/health" | grep -q "healthy"; then
                log "✅ Health check passed"
                break
            elif [ $i -eq 5 ]; then
                log_warn "Health check failed, but service is running"
            else
                sleep 3
            fi
        done
    else
        log_error "❌ Service failed to start"
        sudo systemctl status "$SERVICE_NAME" --no-pager
        exit 1
    fi
    
    log "🎉 Emergency deployment completed!"
    log "🌐 API available at: http://localhost:$API_PORT"
}

# Show status
show_status() {
    configure_environment
    
    log "📊 Current Status:"
    echo ""
    
    echo "Service Status:"
    if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
        echo "  ✅ $SERVICE_NAME is running"
    else
        echo "  ❌ $SERVICE_NAME is not running"
    fi
    
    echo "Port Status:"
    if netstat -tlnp 2>/dev/null | grep ":$API_PORT " || ss -tlnp 2>/dev/null | grep ":$API_PORT "; then
        echo "  ✅ Port $API_PORT is in use"
    else
        echo "  ❌ Port $API_PORT is not in use"
    fi
    
    echo "Health Check:"
    if curl -f -s "http://localhost:$API_PORT/health" | grep -q "healthy"; then
        echo "  ✅ Health endpoint responding"
    else
        echo "  ❌ Health endpoint not responding"
    fi
    
    echo ""
    echo "Recent logs:"
    sudo journalctl -u "$SERVICE_NAME" --no-pager --lines 10 2>/dev/null || echo "No logs available"
}

# Usage
usage() {
    echo "Usage: $0 [COMMAND] [--env=ENVIRONMENT]"
    echo ""
    echo "Commands:"
    echo "  deploy    Emergency deployment (default)"
    echo "  status    Show current status"
    echo "  cleanup   Emergency cleanup only"
    echo "  restart   Restart service"
    echo ""
    echo "Options:"
    echo "  --env=ENV  Environment (production|staging|development)"
    echo ""
    echo "Examples:"
    echo "  $0 deploy --env=production"
    echo "  $0 status --env=production"
    echo "  $0 cleanup"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env=*)
            ENVIRONMENT="${1#*=}"
            shift
            ;;
        deploy|status|cleanup|restart)
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
        emergency_deploy
        ;;
    status)
        show_status
        ;;
    cleanup)
        emergency_cleanup
        ;;
    restart)
        configure_environment
        sudo systemctl restart "$SERVICE_NAME"
        sleep 5
        show_status
        ;;
    *)
        usage
        exit 1
        ;;
esac
