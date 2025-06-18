#!/bin/bash

# Investra Email API Server - Automated Deployment Script
# Handles TypeScript build, PM2 process management, and Nginx configuration

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="${SERVICE_NAME:-investra-email-api}"
ENVIRONMENT="${ENVIRONMENT:-development}"
API_PORT="${API_PORT:-3001}"
SERVER_DIR="${SERVER_DIR:-/opt/investra/email-api}"
LOG_DIR="/var/log/investra"
BACKUP_DIR="/opt/investra/backups"

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

# Function to detect environment settings
detect_environment() {
    log "🔍 Detecting environment configuration..."
    
    case "$ENVIRONMENT" in
        production)
            API_PORT="${API_PORT:-3001}"
            SERVICE_NAME="${SERVICE_NAME:-investra-email-api-prod}"
            SERVER_DIR="${SERVER_DIR:-/opt/investra/email-api-prod}"
            PM2_INSTANCES=2
            ;;
        staging)
            API_PORT="${API_PORT:-3002}"
            SERVICE_NAME="${SERVICE_NAME:-investra-email-api-staging}"
            SERVER_DIR="${SERVER_DIR:-/opt/investra/email-api-staging}"
            PM2_INSTANCES=1
            ;;
        development)
            API_PORT="${API_PORT:-3003}"
            SERVICE_NAME="${SERVICE_NAME:-investra-email-api-dev}"
            SERVER_DIR="${SERVER_DIR:-/opt/investra/email-api-dev}"
            PM2_INSTANCES=1
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    log "✅ Environment: $ENVIRONMENT"
    log "   Service: $SERVICE_NAME"
    log "   Port: $API_PORT"
    log "   Directory: $SERVER_DIR"
    log "   PM2 Instances: $PM2_INSTANCES"
}

# Function to check prerequisites
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check if running with appropriate permissions
    if [[ $EUID -eq 0 ]]; then
        log_warn "Running as root - this is not recommended for production"
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check TypeScript
    if ! command -v tsc &> /dev/null; then
        log_warn "TypeScript not found globally, will try to use local version"
    fi
    
    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        log_info "PM2 not found, installing..."
        if [[ $EUID -eq 0 ]]; then
            npm install -g pm2
        else
            sudo npm install -g pm2
        fi
    fi
    
    log "✅ Prerequisites checked"
}

# Function to install dependencies
install_dependencies() {
    log "📦 Installing dependencies..."
    
    cd "$SCRIPT_DIR"
    
    # Clean install
    npm ci
    
    log "✅ Dependencies installed"
}

# Function to build application
build_application() {
    log "🔨 Building TypeScript application..."
    
    cd "$SCRIPT_DIR"
    
    # Clean previous build
    rm -rf dist/
    
    # Build the application
    npm run build
    
    # Verify build output
    if [ -d "dist" ]; then
        log "✅ Build successful"
        log "📁 Build output:"
        ls -la dist/
    else
        log_error "Build failed - dist directory not found"
        exit 1
    fi
}

# Function to create environment configuration
create_environment_config() {
    log "⚙️ Creating environment configuration..."
    
    cd "$SCRIPT_DIR"
    
    # Create environment-specific .env file
    ENV_FILE=".env.${ENVIRONMENT}"
    
    cat > "$ENV_FILE" << EOF
NODE_ENV=${ENVIRONMENT}
PORT=${API_PORT}
LOG_LEVEL=info
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

# Database configuration
DATABASE_URL=${DATABASE_URL:-}

# API Keys
SUPABASE_URL=${SUPABASE_URL:-}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY:-}
EOF
    
    log "✅ Environment configuration created: $ENV_FILE"
}

# Function to create PM2 ecosystem configuration
create_pm2_config() {
    log "🔧 Creating PM2 ecosystem configuration..."
    
    cd "$SCRIPT_DIR"
    
    # Create environment-specific ecosystem config
    PM2_CONFIG="ecosystem.${ENVIRONMENT}.config.js"
    
    cat > "$PM2_CONFIG" << EOF
module.exports = {
  apps: [
    {
      name: '${SERVICE_NAME}',
      script: 'dist/simple-production-server.js',
      cwd: '${SERVER_DIR}',
      instances: ${PM2_INSTANCES},
      exec_mode: 'cluster',
      
      env: {
        NODE_ENV: '${ENVIRONMENT}',
        PORT: ${API_PORT},
        LOG_LEVEL: 'info'
      },
      
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      log_file: '${LOG_DIR}/${SERVICE_NAME}-combined.log',
      out_file: '${LOG_DIR}/${SERVICE_NAME}-out.log',
      error_file: '${LOG_DIR}/${SERVICE_NAME}-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      autorestart: true,
      kill_timeout: 5000,
      listen_timeout: 3000
    }
  ]
};
EOF
    
    log "✅ PM2 ecosystem configuration created: $PM2_CONFIG"
}

# Function to setup directories and permissions
setup_directories() {
    log "📁 Setting up directories and permissions..."
    
    # Create directories
    if [[ $EUID -eq 0 ]]; then
        mkdir -p "$SERVER_DIR" "$LOG_DIR" "$BACKUP_DIR"
        
        # Create investra user if it doesn't exist
        if ! id "investra" &>/dev/null; then
            useradd -r -s /bin/false investra
            log "✅ Created investra user"
        fi
        
        # Set ownership
        chown -R investra:investra "$SERVER_DIR" "$LOG_DIR" "$BACKUP_DIR"
    else
        sudo mkdir -p "$SERVER_DIR" "$LOG_DIR" "$BACKUP_DIR"
        
        # Create investra user if it doesn't exist
        if ! id "investra" &>/dev/null; then
            sudo useradd -r -s /bin/false investra
            log "✅ Created investra user"
        fi
        
        # Set ownership
        sudo chown -R investra:investra "$SERVER_DIR" "$LOG_DIR" "$BACKUP_DIR"
    fi
    
    log "✅ Directories and permissions configured"
}

# Function to deploy application
deploy_application() {
    log "🚀 Deploying application..."
    
    # Stop existing service if running
    if pm2 list | grep -q "$SERVICE_NAME"; then
        log "🛑 Stopping existing service: $SERVICE_NAME"
        pm2 stop "$SERVICE_NAME" || true
        pm2 delete "$SERVICE_NAME" || true
    fi
    
    # Create backup of existing deployment
    if [ -d "$SERVER_DIR" ] && [ "$(ls -A $SERVER_DIR)" ]; then
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        log "💾 Creating backup: $BACKUP_NAME"
        if [[ $EUID -eq 0 ]]; then
            cp -r "$SERVER_DIR" "$BACKUP_DIR/$BACKUP_NAME"
        else
            sudo cp -r "$SERVER_DIR" "$BACKUP_DIR/$BACKUP_NAME"
        fi
    fi
    
    # Deploy new version
    log "📁 Deploying application files to $SERVER_DIR"
    if [[ $EUID -eq 0 ]]; then
        rm -rf "${SERVER_DIR:?}"/*
        cp -r "$SCRIPT_DIR"/* "$SERVER_DIR/"
        chown -R investra:investra "$SERVER_DIR"
    else
        sudo rm -rf "${SERVER_DIR:?}"/*
        sudo cp -r "$SCRIPT_DIR"/* "$SERVER_DIR/"
        sudo chown -R investra:investra "$SERVER_DIR"
    fi
    
    log "✅ Application deployed"
}

# Function to start application with PM2
start_application() {
    log "🚀 Starting application with PM2..."
    
    cd "$SERVER_DIR"
    
    # Start the application
    pm2 start "ecosystem.${ENVIRONMENT}.config.js"
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script (if running as root)
    if [[ $EUID -eq 0 ]]; then
        pm2 startup systemd -u investra --hp /home/investra
    fi
    
    log "✅ Application started with PM2"
}

# Function to configure Nginx reverse proxy
configure_nginx() {
    log "🌐 Configuring Nginx reverse proxy..."
    
    # Check if Nginx is installed
    if ! command -v nginx &> /dev/null; then
        log_warn "Nginx not found, skipping proxy configuration"
        return 0
    fi
    
    # Create Nginx configuration
    NGINX_CONFIG="/etc/nginx/conf.d/${SERVICE_NAME}.conf"
    
    if [[ $EUID -eq 0 ]]; then
        tee "$NGINX_CONFIG" > /dev/null << EOF
upstream ${SERVICE_NAME} {
    server 127.0.0.1:${API_PORT};
}

server {
    listen 80;
    server_name api-${ENVIRONMENT}.investra.com;
    
    location / {
        proxy_pass http://${SERVICE_NAME};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /health {
        proxy_pass http://${SERVICE_NAME}/health;
        access_log off;
    }
}
EOF
    else
        sudo tee "$NGINX_CONFIG" > /dev/null << EOF
upstream ${SERVICE_NAME} {
    server 127.0.0.1:${API_PORT};
}

server {
    listen 80;
    server_name api-${ENVIRONMENT}.investra.com;
    
    location / {
        proxy_pass http://${SERVICE_NAME};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /health {
        proxy_pass http://${SERVICE_NAME}/health;
        access_log off;
    }
}
EOF
    fi
    
    # Test and reload Nginx
    if nginx -t 2>/dev/null; then
        if [[ $EUID -eq 0 ]]; then
            systemctl reload nginx
        else
            sudo systemctl reload nginx
        fi
        log "✅ Nginx configuration updated"
    else
        log_warn "Nginx configuration test failed, skipping reload"
    fi
}

# Function to verify deployment
verify_deployment() {
    log "🔍 Verifying deployment..."
    
    # Wait for application to start
    sleep 10
    
    # Check PM2 status
    log "📊 PM2 Status:"
    pm2 list
    
    # Check if application is responding
    log "🧪 Testing application health..."
    if timeout 30 bash -c "until curl -f http://localhost:${API_PORT}/health; do sleep 2; done" 2>/dev/null; then
        log "✅ Application health check passed"
    else
        log_warn "Application health check failed or timed out"
    fi
    
    # Show recent logs
    log "📋 Recent application logs:"
    pm2 logs "$SERVICE_NAME" --lines 10 --nostream || true
    
    log "✅ Deployment verification complete"
}

# Function to setup monitoring
setup_monitoring() {
    log "📊 Setting up monitoring..."
    
    # Create monitoring script
    MONITOR_SCRIPT="/opt/investra/monitor-${SERVICE_NAME}.sh"
    
    if [[ $EUID -eq 0 ]]; then
        tee "$MONITOR_SCRIPT" > /dev/null << EOF
#!/bin/bash
SERVICE_NAME="${SERVICE_NAME}"
API_PORT="${API_PORT}"

# Check if PM2 process is running
if ! pm2 list | grep -q "\$SERVICE_NAME.*online"; then
  echo "\$(date): \$SERVICE_NAME is not running, attempting restart"
  pm2 restart "\$SERVICE_NAME"
fi

# Check if API is responding
if ! curl -f "http://localhost:\$API_PORT/health" &>/dev/null; then
  echo "\$(date): \$SERVICE_NAME health check failed"
  pm2 restart "\$SERVICE_NAME"
fi
EOF
        chmod +x "$MONITOR_SCRIPT"
    else
        sudo tee "$MONITOR_SCRIPT" > /dev/null << EOF
#!/bin/bash
SERVICE_NAME="${SERVICE_NAME}"
API_PORT="${API_PORT}"

# Check if PM2 process is running
if ! pm2 list | grep -q "\$SERVICE_NAME.*online"; then
  echo "\$(date): \$SERVICE_NAME is not running, attempting restart"
  pm2 restart "\$SERVICE_NAME"
fi

# Check if API is responding
if ! curl -f "http://localhost:\$API_PORT/health" &>/dev/null; then
  echo "\$(date): \$SERVICE_NAME health check failed"
  pm2 restart "\$SERVICE_NAME"
fi
EOF
        sudo chmod +x "$MONITOR_SCRIPT"
    fi
    
    # Add to crontab for regular monitoring
    (crontab -l 2>/dev/null; echo "*/5 * * * * $MONITOR_SCRIPT >> ${LOG_DIR}/monitor.log 2>&1") | crontab -
    
    log "✅ Monitoring configured"
}

# Function to display final status
show_status() {
    log ""
    log "🎉 Email API Server Deployment Complete!"
    log "========================================"
    log ""
    log "📋 Deployment Summary:"
    log "Environment: $ENVIRONMENT"
    log "Service Name: $SERVICE_NAME"
    log "API Port: $API_PORT"
    log "Server Directory: $SERVER_DIR"
    log "PM2 Instances: $PM2_INSTANCES"
    log ""
    log "🔗 Endpoints:"
    log "Health Check: http://localhost:${API_PORT}/health"
    log "API Base: http://localhost:${API_PORT}/"
    log "Nginx Proxy: http://api-${ENVIRONMENT}.investra.com/"
    log ""
    log "📁 Important Paths:"
    log "Application: $SERVER_DIR"
    log "Logs: $LOG_DIR"
    log "Backups: $BACKUP_DIR"
    log ""
    log "🔧 Management Commands:"
    log "PM2 Status: pm2 list"
    log "PM2 Logs: pm2 logs $SERVICE_NAME"
    log "PM2 Restart: pm2 restart $SERVICE_NAME"
    log "PM2 Stop: pm2 stop $SERVICE_NAME"
    log ""
    log "✅ Deployment successful!"
}

# Main execution function
main() {
    log "🚀 Starting Investra Email API Server Deployment"
    log "Environment: $ENVIRONMENT"
    
    detect_environment
    check_prerequisites
    install_dependencies
    build_application
    create_environment_config
    create_pm2_config
    setup_directories
    deploy_application
    start_application
    configure_nginx
    verify_deployment
    setup_monitoring
    show_status
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "build")
        log "🔨 Building application only..."
        check_prerequisites
        install_dependencies
        build_application
        log "✅ Build complete"
        ;;
    "start")
        log "🚀 Starting application..."
        start_application
        log "✅ Application started"
        ;;
    "stop")
        log "🛑 Stopping application..."
        if pm2 list | grep -q "$SERVICE_NAME"; then
            pm2 stop "$SERVICE_NAME"
            log "✅ Application stopped"
        else
            log "ℹ️ Application not running"
        fi
        ;;
    "restart")
        log "🔄 Restarting application..."
        if pm2 list | grep -q "$SERVICE_NAME"; then
            pm2 restart "$SERVICE_NAME"
            log "✅ Application restarted"
        else
            log "ℹ️ Application not running, starting..."
            start_application
        fi
        ;;
    "status")
        log "📊 Application status:"
        pm2 list
        ;;
    "logs")
        log "📋 Application logs:"
        pm2 logs "$SERVICE_NAME"
        ;;
    *)
        log "Usage: $0 {deploy|build|start|stop|restart|status|logs}"
        log ""
        log "Commands:"
        log "  deploy   - Full deployment (default)"
        log "  build    - Build application only"
        log "  start    - Start application with PM2"
        log "  stop     - Stop application"
        log "  restart  - Restart application"
        log "  status   - Show PM2 status"
        log "  logs     - Show application logs"
        exit 1
        ;;
esac
