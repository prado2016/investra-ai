#!/bin/bash

# Centralized Configuration Validation Script
# Eliminates duplicate environment validation across workflows
# Provides unified secret management and configuration checking

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/deployment-config.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[VALIDATE]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[VALIDATE] WARNING:${NC} $1"; }
log_error() { echo -e "${RED}[VALIDATE] ERROR:${NC} $1"; }
log_info() { echo -e "${BLUE}[VALIDATE] INFO:${NC} $1"; }

# Check if jq is available for JSON parsing
check_jq() {
    if ! command -v jq &> /dev/null; then
        log_error "jq is required for configuration parsing"
        log_info "Install with: sudo dnf install jq  # or  sudo apt install jq"
        exit 1
    fi
}

# Load configuration for environment
load_config() {
    local environment="$1"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
    
    # Check if environment exists in config
    if ! jq -e ".environments.${environment}" "$CONFIG_FILE" >/dev/null 2>&1; then
        log_error "Environment '$environment' not found in configuration"
        log_info "Available environments: $(jq -r '.environments | keys | join(", ")' "$CONFIG_FILE")"
        exit 1
    fi
    
    log "✅ Configuration loaded for environment: $environment"
}

# Validate required secrets
validate_secrets() {
    local environment="$1"
    local errors=0
    
    log "🔍 Validating required secrets..."
    
    # Get required secrets from config
    local required_secrets
    required_secrets=$(jq -r '.required_secrets[]' "$CONFIG_FILE")
    
    while IFS= read -r secret; do
        if [ -z "${!secret}" ]; then
            log_error "Required secret missing: $secret"
            ((errors++))
        else
            # Show truncated value for verification
            local value="${!secret}"
            if [ ${#value} -gt 20 ]; then
                log "✅ $secret: ${value:0:20}... (truncated)"
            else
                log "✅ $secret: $value"
            fi
        fi
    done <<< "$required_secrets"
    
    # Check optional secrets
    log_info "Checking optional secrets..."
    local optional_secrets
    optional_secrets=$(jq -r '.optional_secrets[]' "$CONFIG_FILE")
    
    while IFS= read -r secret; do
        if [ -n "${!secret}" ]; then
            local value="${!secret}"
            if [ ${#value} -gt 20 ]; then
                log "✅ $secret: ${value:0:20}... (truncated)"
            else
                log "✅ $secret: $value"
            fi
        else
            log_warn "$secret: not set (optional)"
        fi
    done <<< "$optional_secrets"
    
    if [ $errors -gt 0 ]; then
        log_error "$errors required secrets are missing"
        return 1
    fi
    
    log "✅ All required secrets validated"
    return 0
}

# Validate environment configuration
validate_environment_config() {
    local environment="$1"
    
    log "🔧 Validating environment configuration..."
    
    # Extract environment-specific config
    local api_port
    local ws_port
    local service_name
    local server_dir
    
    api_port=$(jq -r ".environments.${environment}.api_port" "$CONFIG_FILE")
    ws_port=$(jq -r ".environments.${environment}.ws_port" "$CONFIG_FILE")
    service_name=$(jq -r ".environments.${environment}.service_name" "$CONFIG_FILE")
    server_dir=$(jq -r ".environments.${environment}.server_dir" "$CONFIG_FILE")
    
    log "Environment: $environment"
    log "API Port: $api_port"
    log "WebSocket Port: $ws_port"
    log "Service Name: $service_name"
    log "Server Directory: $server_dir"
    
    # Validate ports are not in use by other environments
    local check_ports
    check_ports=$(jq -r '.port_conflicts.check_ports[]' "$CONFIG_FILE")
    
    log_info "Checking for port conflicts..."
    while IFS= read -r port; do
        if [ "$port" != "$api_port" ] && [ "$port" != "$ws_port" ]; then
            if netstat -tlnp 2>/dev/null | grep -q ":$port " || ss -tlnp 2>/dev/null | grep -q ":$port "; then
                log_warn "Port $port is in use (may conflict with other environments)"
            fi
        fi
    done <<< "$check_ports"
    
    log "✅ Environment configuration validated"
}

# Generate environment file
generate_env_file() {
    local environment="$1"
    local output_file="$2"
    
    log "📝 Generating environment file: $output_file"
    
    # Get configuration values
    local api_port ws_port log_level
    api_port=$(jq -r ".environments.${environment}.api_port" "$CONFIG_FILE")
    ws_port=$(jq -r ".environments.${environment}.ws_port" "$CONFIG_FILE")
    log_level=$(jq -r ".environments.${environment}.log_level" "$CONFIG_FILE")
    
    # Get shared config
    local log_dir
    log_dir=$(jq -r '.shared_config.log_dir' "$CONFIG_FILE")
    
    cat > "$output_file" << EOF
# Generated environment configuration for $environment
# Generated on: $(date)

NODE_ENV=$environment
PORT=$api_port
WS_PORT=$ws_port
LOG_LEVEL=$log_level
LOG_DIR=$log_dir

# Email configuration
EMAIL_HOST=${EMAIL_HOST:-$(jq -r '.default_values.EMAIL_HOST' "$CONFIG_FILE")}
EMAIL_PORT=${EMAIL_PORT:-$(jq -r '.default_values.EMAIL_PORT' "$CONFIG_FILE")}
EMAIL_USER=${EMAIL_USER:-}
EMAIL_PASSWORD=${EMAIL_PASSWORD:-}
EMAIL_SECURE=${EMAIL_SECURE:-$(jq -r '.default_values.EMAIL_SECURE' "$CONFIG_FILE")}

# IMAP configuration
IMAP_HOST=${IMAP_HOST:-$(jq -r '.default_values.IMAP_HOST' "$CONFIG_FILE")}
IMAP_PORT=${IMAP_PORT:-$(jq -r '.default_values.IMAP_PORT' "$CONFIG_FILE")}
IMAP_USER=${IMAP_USER:-}
IMAP_PASSWORD=${IMAP_PASSWORD:-}
IMAP_SECURE=${IMAP_SECURE:-$(jq -r '.default_values.IMAP_SECURE' "$CONFIG_FILE")}
IMAP_ENABLED=${IMAP_ENABLED:-$(jq -r '.default_values.IMAP_ENABLED' "$CONFIG_FILE")}

# Database configuration
DATABASE_URL=${DATABASE_URL:-}

# Supabase Configuration
SUPABASE_URL=${SUPABASE_URL:-}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY:-}
VITE_SUPABASE_URL=${SUPABASE_URL:-}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-}

# WebSocket configuration
WS_ENABLED=${WS_ENABLED:-$(jq -r '.default_values.WS_ENABLED' "$CONFIG_FILE")}

# Monitoring configuration
MONITORING_ENABLED=${MONITORING_ENABLED:-$(jq -r '.default_values.MONITORING_ENABLED' "$CONFIG_FILE")}
EOF
    
    log "✅ Environment file generated: $output_file"
}

# Validate GitHub secrets (for CI/CD)
validate_github_secrets() {
    log "🔍 Validating GitHub secrets configuration..."
    
    local missing_secrets=()
    local required_secrets
    required_secrets=$(jq -r '.required_secrets[]' "$CONFIG_FILE")
    
    while IFS= read -r secret; do
        if [ -z "${!secret}" ]; then
            missing_secrets+=("$secret")
        fi
    done <<< "$required_secrets"
    
    if [ ${#missing_secrets[@]} -gt 0 ]; then
        log_error "Missing GitHub secrets:"
        for secret in "${missing_secrets[@]}"; do
            log_error "  - $secret"
        done
        log_info ""
        log_info "Add these secrets in GitHub Settings → Secrets and variables → Actions:"
        for secret in "${missing_secrets[@]}"; do
            log_info "  - $secret"
        done
        log_info ""
        log_info "See GITHUB_SECRETS_CONFIGURATION.md for detailed instructions"
        return 1
    else
        log "✅ All GitHub secrets are configured"
        return 0
    fi
}

# Show configuration summary
show_config_summary() {
    local environment="$1"
    
    log "📋 Configuration Summary for $environment:"
    echo ""
    
    # Environment-specific settings
    jq -r "
        .environments.${environment} | 
        to_entries | 
        map(\"  \(.key): \(.value)\") | 
        .[]
    " "$CONFIG_FILE"
    
    echo ""
    log "📋 Required Secrets:"
    jq -r '.required_secrets[] | "  - " + .' "$CONFIG_FILE"
    
    echo ""
    log "📋 Optional Secrets:"
    jq -r '.optional_secrets[] | "  - " + .' "$CONFIG_FILE"
}

# Main validation function
validate() {
    local environment="${1:-production}"
    local generate_env="${2:-false}"
    
    check_jq
    load_config "$environment"
    
    if ! validate_secrets "$environment"; then
        log_error "Secret validation failed"
        exit 1
    fi
    
    validate_environment_config "$environment"
    
    if [ "$generate_env" = "true" ]; then
        generate_env_file "$environment" ".env.$environment"
    fi
    
    log "🎉 Configuration validation completed successfully!"
}

# Usage information
usage() {
    echo "Usage: $0 [COMMAND] [ENVIRONMENT] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  validate     Validate configuration and secrets"
    echo "  generate     Generate environment file"
    echo "  summary      Show configuration summary"
    echo "  github       Validate GitHub secrets"
    echo ""
    echo "Environments:"
    echo "  production   Production environment (default)"
    echo "  staging      Staging environment"
    echo "  development  Development environment"
    echo ""
    echo "Examples:"
    echo "  $0 validate production"
    echo "  $0 generate staging"
    echo "  $0 summary development"
    echo "  $0 github"
}

# Parse command line arguments
COMMAND="${1:-validate}"
ENVIRONMENT="${2:-production}"

case "$COMMAND" in
    validate)
        validate "$ENVIRONMENT"
        ;;
    generate)
        validate "$ENVIRONMENT" true
        ;;
    summary)
        check_jq
        load_config "$ENVIRONMENT"
        show_config_summary "$ENVIRONMENT"
        ;;
    github)
        check_jq
        validate_github_secrets
        ;;
    *)
        usage
        exit 1
        ;;
esac
