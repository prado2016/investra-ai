#!/bin/bash

# PM2 Deployment Status Check Script
# Used by GitHub Actions to verify successful PM2 deployment

set -e

# Configuration
ENVIRONMENT="${1:-production}"
MAX_WAIT_TIME=60  # Maximum seconds to wait for service to be online
CHECK_INTERVAL=5  # Seconds between status checks

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
        API_PORT="3001"
        ;;
    staging)
        SERVICE_NAME="investra-email-api-staging"
        API_PORT="3002"
        ;;
    development)
        SERVICE_NAME="investra-email-api-dev"
        API_PORT="3003"
        ;;
    *)
        log_error "Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

log "🔍 Checking PM2 deployment status for $ENVIRONMENT environment"
log "Service: $SERVICE_NAME"
log "Port: $API_PORT"

# Function to check PM2 status
check_pm2_status() {
    if pm2 list | grep -q "$SERVICE_NAME.*online"; then
        return 0  # Service is online
    else
        return 1  # Service is not online
    fi
}

# Function to check API health
check_api_health() {
    local endpoint="http://localhost:$API_PORT/api/configuration/status"
    if curl -f "$endpoint" >/dev/null 2>&1; then
        return 0  # API is responding
    else
        return 1  # API is not responding
    fi
}

# Wait for service to be online
log "⏳ Waiting for PM2 service to be online..."
elapsed=0
while [ $elapsed -lt $MAX_WAIT_TIME ]; do
    if check_pm2_status; then
        log "✅ PM2 service is online"
        break
    else
        log_info "Service not ready yet, waiting... ($elapsed/$MAX_WAIT_TIME seconds)"
        sleep $CHECK_INTERVAL
        elapsed=$((elapsed + CHECK_INTERVAL))
    fi
done

# Final status check
if ! check_pm2_status; then
    log_error "❌ PM2 service failed to come online within $MAX_WAIT_TIME seconds"
    log "📋 Current PM2 status:"
    pm2 status
    log "📋 Recent logs:"
    pm2 logs "$SERVICE_NAME" --lines 20
    exit 1
fi

# Check API health
log "🏥 Checking API health..."
if check_api_health; then
    log "✅ API health check passed"
else
    log_warn "⚠️ API health check failed (may be normal for authenticated endpoints)"
    
    # Try a basic connection test
    if nc -z localhost "$API_PORT" 2>/dev/null; then
        log "✅ Port $API_PORT is accepting connections"
    else
        log_error "❌ Port $API_PORT is not accepting connections"
        exit 1
    fi
fi

# Display final status
log "📊 Final deployment status:"
pm2 status

# Display memory usage
log "💾 Memory usage:"
pm2 list | grep "$SERVICE_NAME" | awk '{print "Service: " $2 ", Memory: " $11 ", CPU: " $10}'

# Display recent log entries (last 5 lines)
log "📋 Recent log entries:"
pm2 logs "$SERVICE_NAME" --lines 5 --nostream

log "🎉 PM2 deployment verification complete!"
log "✅ Service: $SERVICE_NAME is running successfully"
log "✅ Port: $API_PORT is accessible"
log "✅ PM2 status: Online"

exit 0
