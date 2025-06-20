#!/bin/bash

# Investra AI API Server - PM2 Production Startup Script
# This script ensures PM2 starts with all required environment variables
# Usage: ./start-pm2-production.sh [environment]
#   environment: production (default), staging, development

set -e

# Configuration
ENVIRONMENT="${1:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Environment-specific configuration
case "$ENVIRONMENT" in
    production)
        SERVICE_NAME="investra-email-api-prod"
        SERVER_DIR="/opt/investra/email-api-prod"
        API_PORT="3001"
        ;;
    staging)
        SERVICE_NAME="investra-email-api-staging"
        SERVER_DIR="/opt/investra/email-api-staging"
        API_PORT="3002"
        ;;
    development)
        SERVICE_NAME="investra-email-api-dev"
        SERVER_DIR="/opt/investra/email-api-dev"
        API_PORT="3003"
        ;;
    *)
        log_error "Unknown environment: $ENVIRONMENT"
        echo "Valid environments: production, staging, development"
        exit 1
        ;;
esac

# Required Supabase configuration (hardcoded for production)
SUPABASE_URL="https://ecbuwhpipphdssqjwgfm.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNycWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E"

log "🚀 Starting Investra API Server with PM2"
log "Environment: $ENVIRONMENT"
log "Service: $SERVICE_NAME"
log "Directory: $SERVER_DIR"
log "Port: $API_PORT"

# Validate directory exists
if [[ ! -d "$SERVER_DIR" ]]; then
    log_error "Server directory does not exist: $SERVER_DIR"
    exit 1
fi

cd "$SERVER_DIR"

# Check if ecosystem config exists
ECOSYSTEM_CONFIG="ecosystem.${ENVIRONMENT}.config.js"
if [[ ! -f "$ECOSYSTEM_CONFIG" ]]; then
    log_error "PM2 ecosystem config not found: $ECOSYSTEM_CONFIG"
    exit 1
fi

# Validate Supabase configuration
if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
    log_error "Critical Supabase environment variables are missing!"
    log_error "SUPABASE_URL: ${SUPABASE_URL:-'NOT SET'}"
    log_error "SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:20}... (truncated)"
    exit 1
fi

log "✅ Environment validation passed"

# Stop existing processes
log "🛑 Stopping existing PM2 processes..."
pm2 stop "$SERVICE_NAME" 2>/dev/null || log_info "Service was not running"
pm2 delete "$SERVICE_NAME" 2>/dev/null || log_info "Service was not in PM2 list"

# Start with explicit environment variables
log "🚀 Starting PM2 with environment variables..."
SUPABASE_URL="$SUPABASE_URL" \
SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
VITE_SUPABASE_URL="$SUPABASE_URL" \
VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
pm2 start "$ECOSYSTEM_CONFIG" --update-env

# Wait for startup
log "⏳ Waiting for service to start..."
sleep 10

# Verify startup
if pm2 list | grep -q "$SERVICE_NAME.*online"; then
    log "✅ PM2 service started successfully!"
    
    # Save configuration
    pm2 save
    log "💾 PM2 configuration saved"
    
    # Show status
    log "📊 Service Status:"
    pm2 status
    
    # Test API endpoint
    log "🔗 Testing API endpoint..."
    if curl -f "http://localhost:$API_PORT/api/configuration/status" >/dev/null 2>&1; then
        log "✅ API endpoint responding correctly"
    else
        log_warn "⚠️ API endpoint not responding (may require authentication)"
    fi
    
else
    log_error "❌ PM2 service failed to start"
    log "📋 Recent logs:"
    pm2 logs "$SERVICE_NAME" --lines 20
    exit 1
fi

log "🎉 PM2 startup complete!"
log "📋 Useful commands:"
log "   Check status: pm2 status"
log "   View logs: pm2 logs $SERVICE_NAME"
log "   Restart: pm2 restart $SERVICE_NAME"
log "   Stop: pm2 stop $SERVICE_NAME"
log "   Monitor: pm2 monit"
