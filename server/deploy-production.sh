#!/bin/bash

# Investra AI Email Processing API - Production Deployment Script
# Task 11.1: Deploy IMAP Service to Production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="investra-email-api"
SERVER_DIR="/opt/investra/email-api"
SERVICE_USER="investra"
SERVICE_NAME="investra-email-api"

echo -e "${BLUE}🚀 Investra AI Email Processing API - Production Deployment${NC}"
echo -e "${BLUE}===============================================================${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if we have sudo privileges
if ! sudo -n true 2>/dev/null; then
    print_error "This script requires sudo privileges"
    exit 1
fi

print_status "Starting production deployment..."

# Step 1: Install system dependencies
echo -e "${BLUE}📦 Installing system dependencies...${NC}"
sudo apt-get update
sudo apt-get install -y curl build-essential git

# Install Node.js 18+ if not present
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | sed 's/v//') -lt 18 ]]; then
    print_status "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2 process manager..."
    sudo npm install -g pm2
fi

print_status "System dependencies installed"

# Step 2: Create service user and directories
echo -e "${BLUE}👤 Setting up service user and directories...${NC}"
if ! id "$SERVICE_USER" &>/dev/null; then
    sudo useradd --system --home-dir "$SERVER_DIR" --create-home --shell /bin/bash "$SERVICE_USER"
    print_status "Created service user: $SERVICE_USER"
else
    print_warning "Service user $SERVICE_USER already exists"
fi

# Create directories
sudo mkdir -p "$SERVER_DIR"
sudo mkdir -p "$SERVER_DIR/logs"
sudo mkdir -p "$SERVER_DIR/config"

print_status "Directories created"

# Step 3: Copy application files
echo -e "${BLUE}📁 Copying application files...${NC}"
sudo cp -r . "$SERVER_DIR/"
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$SERVER_DIR"

print_status "Application files copied"

# Step 4: Install dependencies and build
echo -e "${BLUE}🔨 Installing dependencies and building...${NC}"
cd "$SERVER_DIR"
sudo -u "$SERVICE_USER" npm install --production
sudo -u "$SERVICE_USER" npm run build

print_status "Dependencies installed and project built"

# Step 5: Copy environment configuration
echo -e "${BLUE}🔧 Setting up environment configuration...${NC}"
if [[ -f ".env.production" ]]; then
    sudo cp .env.production "$SERVER_DIR/.env"
    sudo chown "$SERVICE_USER:$SERVICE_USER" "$SERVER_DIR/.env"
    sudo chmod 600 "$SERVER_DIR/.env"  # Secure the env file
    print_status "Environment configuration copied"
else
    print_warning ".env.production not found, using defaults"
fi

# Step 6: Create PM2 ecosystem configuration
echo -e "${BLUE}⚙️ Creating PM2 configuration...${NC}"
sudo tee "$SERVER_DIR/ecosystem.config.js" > /dev/null <<EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME',
    script: 'dist/production-server.js',
    cwd: '$SERVER_DIR',
    user: '$SERVICE_USER',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: '$SERVER_DIR/logs/combined.log',
    out_file: '$SERVER_DIR/logs/out.log',
    error_file: '$SERVER_DIR/logs/error.log',
    pid_file: '$SERVER_DIR/logs/pid',
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 8000,
    shutdown_with_message: true,
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
EOF

sudo chown "$SERVICE_USER:$SERVICE_USER" "$SERVER_DIR/ecosystem.config.js"
print_status "PM2 configuration created"

# Step 7: Set up systemd service for PM2
echo -e "${BLUE}🔄 Setting up systemd service...${NC}"
sudo tee "/etc/systemd/system/$SERVICE_NAME.service" > /dev/null <<EOF
[Unit]
Description=Investra Email Processing API
After=network.target

[Service]
Type=forking
User=$SERVICE_USER
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin:$SERVER_DIR/node_modules/.bin
Environment=PM2_HOME=$SERVER_DIR/.pm2
PIDFile=$SERVER_DIR/.pm2/pm2.pid
Restart=on-failure

ExecStart=/usr/bin/pm2 start $SERVER_DIR/ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 reload $SERVER_DIR/ecosystem.config.js --env production
ExecStop=/usr/bin/pm2 kill

StandardOutput=null
StandardError=null

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
print_status "Systemd service configured"

# Step 8: Set up log rotation
echo -e "${BLUE}📝 Setting up log rotation...${NC}"
sudo tee "/etc/logrotate.d/$SERVICE_NAME" > /dev/null <<EOF
$SERVER_DIR/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 $SERVICE_USER $SERVICE_USER
}
EOF

print_status "Log rotation configured"

# Step 9: Set up firewall rules (if ufw is available)
if command -v ufw &> /dev/null; then
    echo -e "${BLUE}🔒 Configuring firewall...${NC}"
    sudo ufw allow 3001/tcp comment "Investra Email API"
    print_status "Firewall configured"
fi

# Step 10: Start the service
echo -e "${BLUE}🚀 Starting the service...${NC}"
sudo systemctl start "$SERVICE_NAME"

# Wait a moment for startup
sleep 5

# Check service status
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    print_status "Service started successfully"
    
    # Show service status
    echo -e "${BLUE}📊 Service Status:${NC}"
    sudo systemctl status "$SERVICE_NAME" --no-pager -l
    
    echo -e "${BLUE}📋 PM2 Status:${NC}"
    sudo -u "$SERVICE_USER" pm2 list
    
    echo -e "${BLUE}🌐 Testing API endpoint...${NC}"
    if curl -s http://localhost:3001/health > /dev/null; then
        print_status "API is responding"
        curl -s http://localhost:3001/health | python3 -m json.tool || echo "Health check response received"
    else
        print_warning "API not yet responding (may still be starting up)"
    fi
    
else
    print_error "Service failed to start"
    echo -e "${BLUE}📋 Service logs:${NC}"
    sudo journalctl -u "$SERVICE_NAME" --no-pager -l
    exit 1
fi

echo -e "${GREEN}🎉 Production deployment completed successfully!${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}Service Management Commands:${NC}"
echo -e "Start:    sudo systemctl start $SERVICE_NAME"
echo -e "Stop:     sudo systemctl stop $SERVICE_NAME"
echo -e "Restart:  sudo systemctl restart $SERVICE_NAME"
echo -e "Status:   sudo systemctl status $SERVICE_NAME"
echo -e "Logs:     sudo journalctl -u $SERVICE_NAME -f"
echo -e "PM2 Status: sudo -u $SERVICE_USER pm2 status"
echo -e "PM2 Logs:   sudo -u $SERVICE_USER pm2 logs"
echo -e "${BLUE}===============================================${NC}"
echo -e "API Endpoints:"
echo -e "Health Check: http://localhost:3001/health"
echo -e "API Docs:     http://localhost:3001/api"
echo -e "IMAP Status:  http://localhost:3001/api/imap/status"
echo -e "${GREEN}Ready to process Wealthsimple emails! 🚀${NC}"