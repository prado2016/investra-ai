#!/bin/bash

# Verification Script for Emergency Deployment
# Tests all critical endpoints and functionality

set -e

ENVIRONMENT="${ENVIRONMENT:-production}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[VERIFY]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[VERIFY] WARNING:${NC} $1"; }
log_error() { echo -e "${RED}[VERIFY] ERROR:${NC} $1"; }
log_info() { echo -e "${BLUE}[VERIFY] INFO:${NC} $1"; }

# Configure environment
configure_environment() {
    case "$ENVIRONMENT" in
        production)
            API_PORT="3001"
            SERVICE_NAME="investra-email-api-prod"
            ;;
        staging)
            API_PORT="3002"
            SERVICE_NAME="investra-email-api-staging"
            ;;
        development)
            API_PORT="3003"
            SERVICE_NAME="investra-email-api-dev"
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
}

# Test service status
test_service_status() {
    log "🔍 Testing service status..."
    
    configure_environment
    
    if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
        log "✅ Service $SERVICE_NAME is running"
        
        # Show service details
        echo "Service details:"
        sudo systemctl status "$SERVICE_NAME" --no-pager -l | head -10
    else
        log_error "❌ Service $SERVICE_NAME is not running"
        return 1
    fi
    echo ""
}

# Test port connectivity
test_port_connectivity() {
    log "🔍 Testing port connectivity..."
    
    configure_environment
    
    if netstat -tlnp 2>/dev/null | grep ":$API_PORT " || ss -tlnp 2>/dev/null | grep ":$API_PORT "; then
        log "✅ Port $API_PORT is listening"
        echo "Port details:"
        netstat -tlnp 2>/dev/null | grep ":$API_PORT " || ss -tlnp 2>/dev/null | grep ":$API_PORT "
    else
        log_error "❌ Port $API_PORT is not listening"
        return 1
    fi
    echo ""
}

# Test health endpoint
test_health_endpoint() {
    log "🔍 Testing health endpoint..."
    
    configure_environment
    
    local health_url="http://localhost:$API_PORT/health"
    local response
    
    if response=$(curl -f -s "$health_url" 2>/dev/null); then
        if echo "$response" | grep -q "healthy"; then
            log "✅ Health endpoint responding correctly"
            echo "Response: $response"
        else
            log_warn "⚠️ Health endpoint responding but unexpected content"
            echo "Response: $response"
        fi
    else
        log_error "❌ Health endpoint not responding"
        echo "URL tested: $health_url"
        return 1
    fi
    echo ""
}

# Test API endpoints
test_api_endpoints() {
    log "🔍 Testing API endpoints..."
    
    configure_environment
    
    # Test manual review stats endpoint (should return auth error, not connection error)
    local stats_url="http://localhost:$API_PORT/api/manual-review/stats"
    local response
    
    echo "Testing manual review stats endpoint:"
    if response=$(curl -s "$stats_url" 2>/dev/null); then
        if echo "$response" | grep -q "Missing or invalid Authorization header"; then
            log "✅ API endpoint responding with correct auth error"
            echo "Response: Authentication required (expected)"
        elif echo "$response" | grep -q "Authentication service not configured"; then
            log_error "❌ Authentication service configuration error"
            echo "Response: $response"
            return 1
        else
            log "✅ API endpoint responding"
            echo "Response: $(echo "$response" | head -c 200)..."
        fi
    else
        log_error "❌ API endpoint not responding"
        echo "URL tested: $stats_url"
        return 1
    fi
    
    # Test manual review emails endpoint
    local emails_url="http://localhost:$API_PORT/api/manual-review/emails"
    
    echo "Testing manual review emails endpoint:"
    if response=$(curl -s "$emails_url" 2>/dev/null); then
        if echo "$response" | grep -q "Missing or invalid Authorization header\|User authentication required"; then
            log "✅ Emails endpoint responding with correct auth error"
        else
            log "✅ Emails endpoint responding"
            echo "Response: $(echo "$response" | head -c 200)..."
        fi
    else
        log_error "❌ Emails endpoint not responding"
        return 1
    fi
    echo ""
}

# Test authentication middleware
test_auth_middleware() {
    log "🔍 Testing authentication middleware..."
    
    configure_environment
    
    # Test with invalid token
    local auth_url="http://localhost:$API_PORT/api/manual-review/stats"
    local response
    
    echo "Testing with invalid authorization header:"
    if response=$(curl -s -H "Authorization: Bearer invalid-token" "$auth_url" 2>/dev/null); then
        if echo "$response" | grep -q "Invalid or expired authentication token"; then
            log "✅ Authentication middleware working correctly"
        elif echo "$response" | grep -q "Authentication service not configured"; then
            log_error "❌ Authentication service not configured properly"
            return 1
        else
            log_warn "⚠️ Unexpected auth response"
            echo "Response: $response"
        fi
    else
        log_error "❌ Auth test failed"
        return 1
    fi
    echo ""
}

# Test application logs
test_application_logs() {
    log "🔍 Checking application logs..."
    
    configure_environment
    
    echo "Recent system logs:"
    if sudo journalctl -u "$SERVICE_NAME" --no-pager --lines 10 2>/dev/null; then
        log "✅ System logs accessible"
    else
        log_warn "⚠️ No system logs found"
    fi
    
    echo ""
    echo "Checking for error patterns in logs:"
    local error_count
    error_count=$(sudo journalctl -u "$SERVICE_NAME" --no-pager --lines 50 2>/dev/null | grep -i "error\|failed\|exception" | wc -l)
    
    if [ "$error_count" -eq 0 ]; then
        log "✅ No errors found in recent logs"
    else
        log_warn "⚠️ Found $error_count error entries in recent logs"
        echo "Recent errors:"
        sudo journalctl -u "$SERVICE_NAME" --no-pager --lines 50 2>/dev/null | grep -i "error\|failed\|exception" | tail -5
    fi
    echo ""
}

# Test from external perspective (simulate frontend)
test_external_access() {
    log "🔍 Testing external access (simulating frontend)..."
    
    configure_environment
    
    local server_ip
    server_ip=$(hostname -I | awk '{print $1}')
    
    echo "Testing from server IP: $server_ip"
    
    # Test health from external IP
    if curl -f -s "http://$server_ip:$API_PORT/health" >/dev/null 2>&1; then
        log "✅ External health check successful"
    else
        log_warn "⚠️ External health check failed (may be firewall/network)"
    fi
    
    # Test API from external IP
    if curl -s "http://$server_ip:$API_PORT/api/manual-review/stats" >/dev/null 2>&1; then
        log "✅ External API access successful"
    else
        log_warn "⚠️ External API access failed (may be firewall/network)"
    fi
    echo ""
}

# Show deployment summary
show_deployment_summary() {
    log "📋 Deployment Summary:"
    
    configure_environment
    
    local server_ip
    server_ip=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo "🎯 Service Information:"
    echo "   Environment: $ENVIRONMENT"
    echo "   Service Name: $SERVICE_NAME"
    echo "   API Port: $API_PORT"
    echo "   Server IP: $server_ip"
    echo ""
    echo "🌐 Access URLs:"
    echo "   Health Check: http://$server_ip:$API_PORT/health"
    echo "   API Base: http://$server_ip:$API_PORT/api/"
    echo "   Manual Review: http://$server_ip:$API_PORT/api/manual-review/"
    echo ""
    echo "🔧 Management Commands:"
    echo "   Status: sudo systemctl status $SERVICE_NAME"
    echo "   Restart: sudo systemctl restart $SERVICE_NAME"
    echo "   Logs: sudo journalctl -u $SERVICE_NAME -f"
    echo ""
}

# Run all verification tests
run_all_tests() {
    log "🚀 Running comprehensive verification..."
    echo ""
    
    local failed_tests=0
    
    # Run each test and track failures
    test_service_status || ((failed_tests++))
    test_port_connectivity || ((failed_tests++))
    test_health_endpoint || ((failed_tests++))
    test_api_endpoints || ((failed_tests++))
    test_auth_middleware || ((failed_tests++))
    test_application_logs
    test_external_access
    
    echo ""
    if [ $failed_tests -eq 0 ]; then
        log "🎉 All critical tests passed!"
        log "✅ Email API is fully operational"
        echo ""
        echo "The ERR_CONNECTION_REFUSED errors should now be resolved."
        echo "You can test the email import functionality in your application."
    else
        log_error "❌ $failed_tests critical tests failed"
        log "🔧 Additional troubleshooting may be needed"
    fi
    
    echo ""
    show_deployment_summary
}

# Usage
usage() {
    echo "Usage: $0 [COMMAND] [--env=ENVIRONMENT]"
    echo ""
    echo "Commands:"
    echo "  all       Run all verification tests (default)"
    echo "  service   Test service status only"
    echo "  health    Test health endpoint only"
    echo "  api       Test API endpoints only"
    echo "  auth      Test authentication only"
    echo "  logs      Check application logs only"
    echo "  summary   Show deployment summary only"
    echo ""
    echo "Options:"
    echo "  --env=ENV  Environment (production|staging|development)"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env=*)
            ENVIRONMENT="${1#*=}"
            shift
            ;;
        all|service|health|api|auth|logs|summary)
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
case "${COMMAND:-all}" in
    all)
        run_all_tests
        ;;
    service)
        test_service_status
        ;;
    health)
        test_health_endpoint
        ;;
    api)
        test_api_endpoints
        ;;
    auth)
        test_auth_middleware
        ;;
    logs)
        test_application_logs
        ;;
    summary)
        show_deployment_summary
        ;;
    *)
        usage
        exit 1
        ;;
esac
