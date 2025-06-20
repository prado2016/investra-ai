#!/bin/bash

# Deployment Diagnostic Script
# Helps troubleshoot failed email API deployments

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[DIAGNOSE]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[DIAGNOSE] WARNING:${NC} $1"; }
log_error() { echo -e "${RED}[DIAGNOSE] ERROR:${NC} $1"; }
log_info() { echo -e "${BLUE}[DIAGNOSE] INFO:${NC} $1"; }

# Configure environment settings
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
}

# Check system status
check_system_status() {
    log "🔍 Checking system status..."
    
    echo "System Information:"
    echo "  OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"')"
    echo "  User: $USER"
    echo "  Current directory: $(pwd)"
    echo "  Available space: $(df -h . | tail -1 | awk '{print $4}')"
    echo ""
    
    echo "Node.js Information:"
    if command -v node &> /dev/null; then
        echo "  ✅ Node.js version: $(node --version)"
    else
        echo "  ❌ Node.js not found"
    fi
    
    if command -v npm &> /dev/null; then
        echo "  ✅ npm version: $(npm --version)"
    else
        echo "  ❌ npm not found"
    fi
    echo ""
}

# Check port status
check_port_status() {
    log "🔍 Checking port status..."
    
    configure_environment
    
    echo "Port $API_PORT status:"
    if netstat -tlnp 2>/dev/null | grep ":$API_PORT "; then
        echo "  ⚠️ Port $API_PORT is in use:"
        netstat -tlnp 2>/dev/null | grep ":$API_PORT "
    elif ss -tlnp 2>/dev/null | grep ":$API_PORT "; then
        echo "  ⚠️ Port $API_PORT is in use:"
        ss -tlnp 2>/dev/null | grep ":$API_PORT "
    else
        echo "  ✅ Port $API_PORT is available"
    fi
    echo ""
    
    echo "All listening ports:"
    netstat -tlnp 2>/dev/null | grep LISTEN | head -10 || ss -tlnp 2>/dev/null | grep LISTEN | head -10
    echo ""
}

# Check service status
check_service_status() {
    log "🔍 Checking service status..."
    
    configure_environment
    
    echo "Systemd service status:"
    if systemctl list-units --type=service | grep -q "$SERVICE_NAME"; then
        echo "  ✅ Service $SERVICE_NAME exists"
        sudo systemctl status "$SERVICE_NAME" --no-pager || true
    else
        echo "  ❌ Service $SERVICE_NAME not found"
    fi
    echo ""
    
    echo "PM2 process status:"
    if command -v pm2 &> /dev/null; then
        echo "  ✅ PM2 is available"
        pm2 list || echo "  No PM2 processes found"
    else
        echo "  ❌ PM2 not found"
    fi
    echo ""
}

# Check deployment files
check_deployment_files() {
    log "🔍 Checking deployment files..."
    
    configure_environment
    
    echo "Server directory: $SERVER_DIR"
    if [ -d "$SERVER_DIR" ]; then
        echo "  ✅ Server directory exists"
        echo "  Contents:"
        sudo ls -la "$SERVER_DIR" | head -10
        echo ""
        
        # Check key files
        if [ -f "$SERVER_DIR/dist/standalone-enhanced-server-production.js" ]; then
            echo "  ✅ Main server file exists"
            echo "  Size: $(sudo stat -c%s "$SERVER_DIR/dist/standalone-enhanced-server-production.js" 2>/dev/null || echo "unknown")"
        else
            echo "  ❌ Main server file missing: dist/standalone-enhanced-server-production.js"
        fi
        
        if [ -f "$SERVER_DIR/.env.$ENVIRONMENT" ]; then
            echo "  ✅ Environment file exists: .env.$ENVIRONMENT"
            echo "  First few lines (sanitized):"
            sudo head -5 "$SERVER_DIR/.env.$ENVIRONMENT" | sed 's/=.*/=***/' || true
        else
            echo "  ❌ Environment file missing: .env.$ENVIRONMENT"
        fi
        
        if [ -f "$SERVER_DIR/package.json" ]; then
            echo "  ✅ package.json exists"
        else
            echo "  ❌ package.json missing"
        fi
        
        if [ -d "$SERVER_DIR/node_modules" ]; then
            echo "  ✅ node_modules directory exists"
            echo "  Module count: $(sudo find "$SERVER_DIR/node_modules" -maxdepth 1 -type d | wc -l)"
        else
            echo "  ❌ node_modules directory missing"
        fi
    else
        echo "  ❌ Server directory does not exist"
    fi
    echo ""
}

# Check authentication middleware
check_auth_middleware() {
    log "🔍 Checking authentication middleware..."
    
    configure_environment
    
    if [ -f "$SERVER_DIR/dist/authMiddleware.js" ]; then
        echo "  ✅ Authentication middleware exists: dist/authMiddleware.js"
    else
        echo "  ❌ Authentication middleware missing: dist/authMiddleware.js"
    fi
    
    if [ -f "$SERVER_DIR/dist/middleware/authMiddleware.js" ]; then
        echo "  ✅ Authentication middleware exists: dist/middleware/authMiddleware.js"
    else
        echo "  ❌ Authentication middleware missing: dist/middleware/authMiddleware.js"
    fi
    echo ""
}

# Test server startup
test_server_startup() {
    log "🧪 Testing server startup..."
    
    configure_environment
    
    if [ ! -d "$SERVER_DIR" ]; then
        log_error "Server directory does not exist: $SERVER_DIR"
        return 1
    fi
    
    cd "$SERVER_DIR"
    
    echo "Testing Node.js execution:"
    if sudo -u investra /usr/bin/node --version; then
        echo "  ✅ Node.js execution works for investra user"
    else
        echo "  ❌ Node.js execution failed for investra user"
    fi
    
    echo "Testing server file syntax:"
    if sudo -u investra /usr/bin/node -c dist/standalone-enhanced-server-production.js; then
        echo "  ✅ Server file syntax is valid"
    else
        echo "  ❌ Server file syntax check failed"
    fi
    
    echo "Testing server startup (10 second test):"
    if sudo -u investra timeout 10s /usr/bin/node dist/standalone-enhanced-server-production.js > /tmp/server-test.log 2>&1 &
    then
        SERVER_PID=$!
        sleep 5
        
        if kill -0 $SERVER_PID 2>/dev/null; then
            echo "  ✅ Server process started successfully"
            kill $SERVER_PID 2>/dev/null || true
        else
            echo "  ❌ Server process exited early"
        fi
        
        echo "Server test output:"
        cat /tmp/server-test.log 2>/dev/null | head -20 || echo "No test log generated"
        rm -f /tmp/server-test.log
    else
        echo "  ❌ Failed to start server test"
    fi
    echo ""
}

# Check logs
check_logs() {
    log "🔍 Checking logs..."
    
    configure_environment
    
    echo "System logs for service:"
    if sudo journalctl -u "$SERVICE_NAME" --no-pager --lines 20 2>/dev/null; then
        echo "  ✅ System logs retrieved"
    else
        echo "  ❌ No system logs found for $SERVICE_NAME"
    fi
    echo ""
    
    echo "Application logs:"
    LOG_FILES=(
        "/var/log/investra/$SERVICE_NAME-combined.log"
        "/var/log/investra/$SERVICE_NAME-error.log"
        "/var/log/investra/$SERVICE_NAME-out.log"
    )
    
    for log_file in "${LOG_FILES[@]}"; do
        if [ -f "$log_file" ]; then
            echo "  ✅ Log file exists: $log_file"
            echo "  Last 10 lines:"
            sudo tail -10 "$log_file" 2>/dev/null || echo "  Cannot read log file"
        else
            echo "  ❌ Log file missing: $log_file"
        fi
    done
    echo ""
}

# Test connectivity
test_connectivity() {
    log "🔍 Testing connectivity..."
    
    configure_environment
    
    echo "Testing health endpoint:"
    HEALTH_URL="http://localhost:$API_PORT/health"
    
    if response=$(curl -f -s "$HEALTH_URL" 2>/dev/null); then
        echo "  ✅ Health endpoint responding: $response"
    else
        echo "  ❌ Health endpoint not responding"
        echo "  URL tested: $HEALTH_URL"
    fi
    
    echo "Testing API endpoint:"
    API_URL="http://localhost:$API_PORT/api/manual-review/stats"
    
    if response=$(curl -s "$API_URL" 2>/dev/null); then
        echo "  ✅ API endpoint responding: $(echo "$response" | head -c 100)..."
    else
        echo "  ❌ API endpoint not responding"
        echo "  URL tested: $API_URL"
    fi
    echo ""
}

# Quick fix attempt
quick_fix() {
    log "🔧 Attempting quick fix..."
    
    configure_environment
    
    echo "1. Stopping any conflicting services..."
    sudo systemctl stop investra-email-server 2>/dev/null || true
    sudo systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    
    if command -v pm2 &> /dev/null; then
        pm2 stop all 2>/dev/null || true
        pm2 delete all 2>/dev/null || true
    fi
    
    sudo fuser -k "$API_PORT/tcp" 2>/dev/null || true
    sleep 3
    
    echo "2. Checking if unified deployment script exists..."
    if [ -f "$SCRIPT_DIR/unified-deployment.sh" ]; then
        echo "  ✅ Unified deployment script found"
        chmod +x "$SCRIPT_DIR/unified-deployment.sh"
        
        echo "3. Attempting deployment..."
        export ENVIRONMENT="$ENVIRONMENT"
        export DEPLOYMENT_MODE="systemd"
        
        # Set minimal required environment variables
        export SUPABASE_URL="${SUPABASE_URL:-https://ecbuwhpipphdssqjwgfm.supabase.co}"
        export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzU4NjEsImV4cCI6MjA2NDQ1MTg2MX0.QMWhB6lpgO3YRGg5kGKz7347DZzRcDiQ6QLupznZi1E}"
        
        if "$SCRIPT_DIR/unified-deployment.sh" deploy --env="$ENVIRONMENT" --mode=systemd; then
            echo "  ✅ Quick fix deployment successful"
        else
            echo "  ❌ Quick fix deployment failed"
        fi
    else
        echo "  ❌ Unified deployment script not found"
    fi
}

# Full diagnostic
full_diagnostic() {
    log "🚀 Running full diagnostic..."
    echo ""
    
    check_system_status
    check_port_status
    check_service_status
    check_deployment_files
    check_auth_middleware
    test_server_startup
    check_logs
    test_connectivity
    
    log "🎯 Diagnostic completed"
}

# Usage
usage() {
    echo "Usage: $0 [COMMAND] [--env=ENVIRONMENT]"
    echo ""
    echo "Commands:"
    echo "  full      Run full diagnostic (default)"
    echo "  status    Check service and port status"
    echo "  files     Check deployment files"
    echo "  logs      Check application logs"
    echo "  test      Test server startup"
    echo "  fix       Attempt quick fix"
    echo ""
    echo "Options:"
    echo "  --env=ENV  Environment (production|staging|development)"
    echo ""
    echo "Examples:"
    echo "  $0 full --env=production"
    echo "  $0 status --env=production"
    echo "  $0 fix --env=production"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env=*)
            ENVIRONMENT="${1#*=}"
            shift
            ;;
        full|status|files|logs|test|fix)
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
case "${COMMAND:-full}" in
    full)
        full_diagnostic
        ;;
    status)
        check_system_status
        check_port_status
        check_service_status
        ;;
    files)
        check_deployment_files
        check_auth_middleware
        ;;
    logs)
        check_logs
        ;;
    test)
        test_server_startup
        test_connectivity
        ;;
    fix)
        quick_fix
        ;;
    *)
        usage
        exit 1
        ;;
esac
