#!/bin/bash

# RHEL VM Email Server Setup Script
# This script prepares a RHEL/CentOS VM for email server deployment

set -e

echo "🐧 RHEL Email Server Setup for Investra AI"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should NOT be run as root for security reasons"
        print_status "Please run as a regular user with sudo privileges"
        exit 1
    fi
}

# Check RHEL version compatibility
check_rhel_version() {
    print_header "📋 Checking RHEL Version..."
    
    if [ -f /etc/redhat-release ]; then
        RHEL_VERSION=$(cat /etc/redhat-release)
        print_status "Detected: $RHEL_VERSION"
        
        # Extract major version number
        if [[ $RHEL_VERSION =~ [0-9]+ ]]; then
            MAJOR_VERSION=${BASH_REMATCH[0]}
            if [ "$MAJOR_VERSION" -lt 8 ]; then
                print_error "RHEL/CentOS 8+ required. Current version: $MAJOR_VERSION"
                exit 1
            fi
            print_status "Version check passed: RHEL/CentOS $MAJOR_VERSION"
        fi
    else
        print_error "Not a RHEL/CentOS system"
        exit 1
    fi
}

# Update system packages
update_system() {
    print_header "📦 Updating System Packages..."
    
    print_status "Updating package cache..."
    sudo dnf update -y
    
    print_status "Installing essential packages..."
    sudo dnf install -y \
        curl \
        wget \
        git \
        unzip \
        tar \
        net-tools \
        bind-utils \
        openssl \
        firewalld \
        logrotate \
        cronie \
        rsync
    
    print_status "System packages updated successfully"
}

# Install Docker
install_docker() {
    print_header "🐳 Installing Docker..."
    
    if command -v docker &> /dev/null; then
        print_status "Docker is already installed"
        docker --version
        return 0
    fi
    
    print_status "Adding Docker repository..."
    sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
    
    print_status "Installing Docker packages..."
    sudo dnf install -y \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin
    
    print_status "Starting and enabling Docker service..."
    sudo systemctl start docker
    sudo systemctl enable docker
    
    print_status "Adding current user to docker group..."
    sudo usermod -aG docker $USER
    
    print_status "Docker installation completed"
    print_warning "You may need to log out and back in for docker group membership to take effect"
}

# Install Docker Compose (fallback if plugin not available)
install_docker_compose() {
    print_header "🔧 Installing Docker Compose..."
    
    if docker compose version &> /dev/null; then
        print_status "Docker Compose plugin is available"
        docker compose version
        return 0
    fi
    
    if command -v docker-compose &> /dev/null; then
        print_status "Docker Compose is already installed"
        docker-compose --version
        return 0
    fi
    
    print_status "Installing Docker Compose standalone..."
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    print_status "Docker Compose installed successfully"
    docker-compose --version
}

# Configure firewall
configure_firewall() {
    print_header "🔥 Configuring Firewall..."
    
    # Start firewalld if not running
    if ! sudo systemctl is-active --quiet firewalld; then
        print_status "Starting firewalld..."
        sudo systemctl start firewalld
        sudo systemctl enable firewalld
    fi
    
    print_status "Configuring email server ports..."
    
    # Allow email services
    sudo firewall-cmd --permanent --add-service=smtp
    sudo firewall-cmd --permanent --add-service=smtp-submission
    sudo firewall-cmd --permanent --add-service=imaps
    
    # Allow web interface
    sudo firewall-cmd --permanent --add-port=8080/tcp
    
    # Allow HTTP/HTTPS for Let's Encrypt
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    
    # Reload firewall rules
    sudo firewall-cmd --reload
    
    print_status "Firewall configured successfully"
    
    # Display current rules
    print_status "Current firewall rules:"
    sudo firewall-cmd --list-all
}

# Stop conflicting services
stop_conflicting_services() {
    print_header "⚡ Stopping Conflicting Services..."
    
    # List of services that might conflict with email server
    SERVICES=("postfix" "sendmail" "exim" "qmail")
    
    for service in "${SERVICES[@]}"; do
        if sudo systemctl is-active --quiet $service; then
            print_status "Stopping $service..."
            sudo systemctl stop $service
            sudo systemctl disable $service
        else
            print_status "$service is not running"
        fi
    done
    
    print_status "Conflicting services handled"
}

# Install SSL certificate tools
install_ssl_tools() {
    print_header "🔐 Installing SSL Certificate Tools..."
    
    if command -v certbot &> /dev/null; then
        print_status "Certbot is already installed"
        certbot --version
        return 0
    fi
    
    print_status "Installing EPEL repository..."
    sudo dnf install -y epel-release
    
    print_status "Installing certbot..."
    sudo dnf install -y certbot
    
    print_status "SSL tools installed successfully"
    certbot --version
}

# Create email server directory structure
create_directory_structure() {
    print_header "📁 Creating Directory Structure..."
    
    EMAIL_DIR="$HOME/investra-email-server"
    
    print_status "Creating email server directory: $EMAIL_DIR"
    mkdir -p "$EMAIL_DIR"
    
    print_status "Creating data directories..."
    mkdir -p "$EMAIL_DIR/docker-data/dms/"{mail-data,mail-state,mail-logs,config,certs}
    mkdir -p "$EMAIL_DIR/docker-data/roundcube"
    mkdir -p "$EMAIL_DIR/backups"
    mkdir -p "$EMAIL_DIR/logs"
    
    print_status "Setting proper permissions..."
    chmod 755 "$EMAIL_DIR"
    chmod -R 755 "$EMAIL_DIR/docker-data"
    
    print_status "Directory structure created successfully"
}

# Create system user for email server (optional)
create_email_user() {
    print_header "👤 Email Server User Setup..."
    
    read -p "Create dedicated 'mailserver' user? (y/N): " create_user
    
    if [[ $create_user =~ ^[Yy]$ ]]; then
        if id "mailserver" &>/dev/null; then
            print_status "User 'mailserver' already exists"
        else
            print_status "Creating mailserver user..."
            sudo useradd -r -s /bin/false -d /var/mail mailserver
            print_status "Mailserver user created"
        fi
    else
        print_status "Using current user for email server"
    fi
}

# Set up monitoring tools
setup_monitoring() {
    print_header "📊 Setting Up Monitoring Tools..."
    
    EMAIL_DIR="$HOME/investra-email-server"
    
    # Create system monitoring script
    cat > "$EMAIL_DIR/system-monitor.sh" << 'EOF'
#!/bin/bash
# System monitoring script for email server

echo "=== System Monitoring Report $(date) ==="
echo ""

# System resources
echo "📊 System Resources:"
echo "Memory Usage:"
free -h
echo ""
echo "Disk Usage:"
df -h | grep -E '(Filesystem|/dev|tmpfs)'
echo ""
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "CPU Usage: " 100 - $1 "%"}'
echo ""

# Network status
echo "🌐 Network Status:"
ss -tlnp | grep -E ':(25|587|993|8080)' || echo "No email ports found listening"
echo ""

# Docker status
echo "🐳 Docker Status:"
if command -v docker &> /dev/null; then
    docker system df
    echo ""
    if [ -f docker-compose.yml ]; then
        docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null || echo "No compose services found"
    fi
else
    echo "Docker not installed"
fi
echo ""

# Service status
echo "⚙️ Service Status:"
systemctl is-active docker 2>/dev/null && echo "Docker: Active" || echo "Docker: Inactive"
systemctl is-active firewalld 2>/dev/null && echo "Firewalld: Active" || echo "Firewalld: Inactive"
echo ""

# Log summary
echo "📜 Recent Log Summary:"
if [ -d "docker-data/dms/mail-logs" ]; then
    echo "Email log files:"
    ls -la docker-data/dms/mail-logs/ 2>/dev/null || echo "No email logs found"
else
    echo "Email logs directory not found"
fi

echo "=== End of Report ==="
EOF
    
    chmod +x "$EMAIL_DIR/system-monitor.sh"
    print_status "System monitoring script created"
    
    # Create email-specific monitoring script
    cat > "$EMAIL_DIR/email-monitor.sh" << 'EOF'
#!/bin/bash
# Email server specific monitoring

echo "=== Email Server Monitoring $(date) ==="
echo ""

# Container health
echo "🐳 Container Status:"
if command -v docker &> /dev/null; then
    if [ -f docker-compose.yml ]; then
        docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null
        echo ""
        
        # Container logs (last 20 lines)
        echo "📜 Recent Container Logs:"
        docker compose logs --tail=20 mailserver 2>/dev/null || echo "Could not fetch mailserver logs"
        echo ""
    fi
else
    echo "Docker not available"
fi

# Email queue status
echo "📬 Mail Queue Status:"
if docker compose ps mailserver | grep -q "Up"; then
    docker compose exec -T mailserver postqueue -p 2>/dev/null || echo "Could not check mail queue"
else
    echo "Mailserver container not running"
fi
echo ""

# Port connectivity
echo "🔌 Port Connectivity:"
for port in 25 587 993 8080; do
    if timeout 2 bash -c "</dev/tcp/localhost/$port" 2>/dev/null; then
        echo "Port $port: ✅ Open"
    else
        echo "Port $port: ❌ Closed"
    fi
done
echo ""

# SSL certificate status
echo "🔐 SSL Certificate Status:"
if [ -d "docker-data/dms/certs" ]; then
    find docker-data/dms/certs -name "*.pem" -exec echo "Found: {}" \;
    
    # Check certificate expiry
    for cert in docker-data/dms/certs/*/fullchain.pem; do
        if [ -f "$cert" ]; then
            echo "Certificate: $cert"
            openssl x509 -in "$cert" -noout -enddate 2>/dev/null || echo "Could not read certificate"
        fi
    done
else
    echo "No SSL certificates directory found"
fi

echo "=== End of Email Monitoring ==="
EOF
    
    chmod +x "$EMAIL_DIR/email-monitor.sh"
    print_status "Email monitoring script created"
}

# Create maintenance scripts
create_maintenance_scripts() {
    print_header "🛠️ Creating Maintenance Scripts..."
    
    EMAIL_DIR="$HOME/investra-email-server"
    
    # Email server start script
    cat > "$EMAIL_DIR/start-email-server.sh" << 'EOF'
#!/bin/bash
# Start email server script

echo "🚀 Starting Investra Email Server..."

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found in current directory"
    exit 1
fi

# Start services
if command -v docker compose &> /dev/null; then
    docker compose up -d
elif command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    echo "❌ Docker Compose not found"
    exit 1
fi

echo "✅ Email server started"
echo "📊 Container status:"
docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null

echo ""
echo "🔗 Access points:"
echo "   Web Interface: http://$(hostname -I | awk '{print $1}'):8080"
echo "   IMAP: $(hostname -I | awk '{print $1}'):993"
echo "   SMTP: $(hostname -I | awk '{print $1}'):587"
EOF
    
    chmod +x "$EMAIL_DIR/start-email-server.sh"
    
    # Email server stop script
    cat > "$EMAIL_DIR/stop-email-server.sh" << 'EOF'
#!/bin/bash
# Stop email server script

echo "🛑 Stopping Investra Email Server..."

if [ -f "docker-compose.yml" ]; then
    if command -v docker compose &> /dev/null; then
        docker compose down
    elif command -v docker-compose &> /dev/null; then
        docker-compose down
    else
        echo "❌ Docker Compose not found"
        exit 1
    fi
    echo "✅ Email server stopped"
else
    echo "❌ docker-compose.yml not found"
    exit 1
fi
EOF
    
    chmod +x "$EMAIL_DIR/stop-email-server.sh"
    
    # Email server restart script
    cat > "$EMAIL_DIR/restart-email-server.sh" << 'EOF'
#!/bin/bash
# Restart email server script

echo "🔄 Restarting Investra Email Server..."

./stop-email-server.sh
sleep 5
./start-email-server.sh

echo "✅ Email server restarted"
EOF
    
    chmod +x "$EMAIL_DIR/restart-email-server.sh"
    
    print_status "Maintenance scripts created successfully"
}

# Setup log rotation
setup_log_rotation() {
    print_header "📋 Setting Up Log Rotation..."
    
    EMAIL_DIR="$HOME/investra-email-server"
    
    # Create logrotate configuration
    sudo tee /etc/logrotate.d/investra-email << EOF
$EMAIL_DIR/docker-data/dms/mail-logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    copytruncate
    create 644 $(whoami) $(whoami)
    postrotate
        # Restart email server to reopen log files
        $EMAIL_DIR/restart-email-server.sh > /dev/null 2>&1 || true
    endscript
}

$EMAIL_DIR/logs/*.log {
    weekly
    missingok
    rotate 12
    compress
    delaycompress
    copytruncate
    create 644 $(whoami) $(whoami)
}
EOF
    
    print_status "Log rotation configured"
    
    # Test logrotate configuration
    sudo logrotate -d /etc/logrotate.d/investra-email && print_status "Logrotate test passed" || print_warning "Logrotate test failed"
}

# Create backup system
setup_backup_system() {
    print_header "💾 Setting Up Backup System..."
    
    EMAIL_DIR="$HOME/investra-email-server"
    BACKUP_DIR="/backup/investra-email"
    
    # Create backup directory
    sudo mkdir -p "$BACKUP_DIR"
    sudo chown $(whoami):$(whoami) "$BACKUP_DIR"
    
    # Create backup script
    cat > "$EMAIL_DIR/backup-email-server.sh" << 'EOF'
#!/bin/bash
# Email server backup script

BACKUP_DIR="/backup/investra-email"
DATE=$(date +%Y%m%d_%H%M%S)
EMAIL_DIR="$HOME/investra-email-server"

echo "📦 Starting email server backup at $(date)"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

cd "$EMAIL_DIR" || exit 1

# Backup configuration and data
echo "Backing up configuration and data..."
tar -czf "$BACKUP_DIR/email-config-$DATE.tar.gz" \
    docker-compose.yml \
    .env \
    docker-data/dms/config/ \
    *.sh 2>/dev/null

# Backup email data (can be large)
echo "Backing up email data..."
tar -czf "$BACKUP_DIR/email-data-$DATE.tar.gz" \
    docker-data/dms/mail-data/ 2>/dev/null

# Backup SSL certificates
if [ -d "docker-data/dms/certs" ]; then
    echo "Backing up SSL certificates..."
    tar -czf "$BACKUP_DIR/ssl-certs-$DATE.tar.gz" \
        docker-data/dms/certs/ 2>/dev/null
fi

# Create backup manifest
cat > "$BACKUP_DIR/backup-manifest-$DATE.txt" << MANIFEST
Investra Email Server Backup
============================
Date: $(date)
Hostname: $(hostname)
User: $(whoami)
Email Dir: $EMAIL_DIR

Files:
- email-config-$DATE.tar.gz (Configuration and scripts)
- email-data-$DATE.tar.gz (Email data)
- ssl-certs-$DATE.tar.gz (SSL certificates)

Docker Images:
$(docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep -E "(mailserver|roundcube)")

Container Status:
$(docker compose ps 2>/dev/null || echo "Could not get container status")
MANIFEST

# Clean up old backups (keep last 7 days)
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.txt" -mtime +7 -delete

echo "✅ Backup completed successfully"
echo "📁 Backup location: $BACKUP_DIR"
ls -la "$BACKUP_DIR"/*$DATE*
EOF
    
    chmod +x "$EMAIL_DIR/backup-email-server.sh"
    
    # Create restore script
    cat > "$EMAIL_DIR/restore-email-server.sh" << 'EOF'
#!/bin/bash
# Email server restore script

BACKUP_DIR="/backup/investra-email"
EMAIL_DIR="$HOME/investra-email-server"

echo "📥 Email Server Restore Script"
echo "=============================="

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Backup directory not found: $BACKUP_DIR"
    exit 1
fi

echo "Available backups:"
ls -la "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "No backup files found"

read -p "Enter backup date (YYYYMMDD_HHMMSS) to restore: " BACKUP_DATE

if [ -z "$BACKUP_DATE" ]; then
    echo "❌ No backup date specified"
    exit 1
fi

cd "$EMAIL_DIR" || exit 1

# Stop email server
echo "🛑 Stopping email server..."
./stop-email-server.sh 2>/dev/null || true

# Restore configuration
if [ -f "$BACKUP_DIR/email-config-$BACKUP_DATE.tar.gz" ]; then
    echo "📄 Restoring configuration..."
    tar -xzf "$BACKUP_DIR/email-config-$BACKUP_DATE.tar.gz"
else
    echo "⚠️ Configuration backup not found"
fi

# Restore email data
if [ -f "$BACKUP_DIR/email-data-$BACKUP_DATE.tar.gz" ]; then
    echo "📬 Restoring email data..."
    tar -xzf "$BACKUP_DIR/email-data-$BACKUP_DATE.tar.gz"
else
    echo "⚠️ Email data backup not found"
fi

# Restore SSL certificates
if [ -f "$BACKUP_DIR/ssl-certs-$BACKUP_DATE.tar.gz" ]; then
    echo "🔐 Restoring SSL certificates..."
    tar -xzf "$BACKUP_DIR/ssl-certs-$BACKUP_DATE.tar.gz"
else
    echo "⚠️ SSL certificates backup not found"
fi

echo "✅ Restore completed"
echo "🚀 Starting email server..."
./start-email-server.sh

echo "📊 Checking service status..."
sleep 5
./email-monitor.sh
EOF
    
    chmod +x "$EMAIL_DIR/restore-email-server.sh"
    
    print_status "Backup system created successfully"
    
    # Setup automated backups
    read -p "Setup daily automated backups? (Y/n): " setup_auto_backup
    if [[ ! $setup_auto_backup =~ ^[Nn]$ ]]; then
        # Add to crontab
        (crontab -l 2>/dev/null; echo "0 2 * * * $EMAIL_DIR/backup-email-server.sh >> $EMAIL_DIR/logs/backup.log 2>&1") | crontab -
        print_status "Daily backup scheduled at 2 AM"
    fi
}

# Network optimization for email server
optimize_network() {
    print_header "🌐 Optimizing Network Configuration..."
    
    # Create sysctl configuration for email server
    sudo tee /etc/sysctl.d/99-email-server.conf << 'EOF'
# Email server network optimizations

# Increase network buffer sizes
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216

# TCP optimizations
net.ipv4.tcp_rmem = 4096 65536 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr

# Connection tracking for email server
net.netfilter.nf_conntrack_max = 65536
net.netfilter.nf_conntrack_tcp_timeout_established = 86400

# Reduce TIME_WAIT sockets
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
EOF
    
    # Apply sysctl settings
    sudo sysctl -p /etc/sysctl.d/99-email-server.conf
    
    print_status "Network optimization applied"
}

# Security hardening
apply_security_hardening() {
    print_header "🔒 Applying Security Hardening..."
    
    EMAIL_DIR="$HOME/investra-email-server"
    
    # Set secure file permissions
    print_status "Setting secure file permissions..."
    chmod 600 "$EMAIL_DIR/.env" 2>/dev/null || true
    chmod 600 "$EMAIL_DIR/docker-data/dms/config/postfix-accounts.cf" 2>/dev/null || true
    
    # Create fail2ban configuration for email server
    if command -v fail2ban-server &> /dev/null; then
        print_status "Configuring fail2ban for email server..."
        
        sudo tee /etc/fail2ban/jail.d/email-server.conf << 'EOF'
[postfix-sasl]
enabled = true
port = smtp,465,submission
filter = postfix-sasl
logpath = /var/log/mail.log
maxretry = 3
bantime = 3600

[dovecot]
enabled = true
port = pop3,pop3s,imap,imaps,submission,465,sieve
filter = dovecot
logpath = /var/log/mail.log
maxretry = 3
bantime = 3600
EOF
        
        sudo systemctl restart fail2ban 2>/dev/null || print_warning "Could not restart fail2ban"
    else
        print_warning "fail2ban not installed - consider installing for additional security"
    fi
    
    # Set up automatic security updates
    if command -v dnf-automatic &> /dev/null || sudo dnf install -y dnf-automatic; then
        print_status "Configuring automatic security updates..."
        sudo systemctl enable --now dnf-automatic-install.timer
    else
        print_warning "Could not configure automatic updates"
    fi
    
    print_status "Security hardening applied"
}

# Final system check
final_system_check() {
    print_header "✅ Final System Check..."
    
    EMAIL_DIR="$HOME/investra-email-server"
    
    echo "System Information:"
    echo "=================="
    echo "OS: $(cat /etc/redhat-release)"
    echo "Kernel: $(uname -r)"
    echo "Architecture: $(uname -m)"
    echo "Hostname: $(hostname)"
    echo "IP Address: $(hostname -I | awk '{print $1}')"
    echo ""
    
    echo "Installed Components:"
    echo "===================="
    docker --version 2>/dev/null || echo "Docker: Not installed"
    docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || echo "Docker Compose: Not installed"
    certbot --version 2>/dev/null || echo "Certbot: Not installed"
    echo ""
    
    echo "Service Status:"
    echo "==============="
    systemctl is-active docker && echo "Docker: Active" || echo "Docker: Inactive"
    systemctl is-active firewalld && echo "Firewalld: Active" || echo "Firewalld: Inactive"
    echo ""
    
    echo "Network Ports:"
    echo "=============="
    sudo firewall-cmd --list-ports 2>/dev/null || echo "Could not list firewall ports"
    echo ""
    
    echo "Directory Structure:"
    echo "==================="
    if [ -d "$EMAIL_DIR" ]; then
        ls -la "$EMAIL_DIR"
        echo ""
        echo "Scripts available:"
        ls -la "$EMAIL_DIR"/*.sh 2>/dev/null || echo "No scripts found"
    else
        echo "Email directory not created"
    fi
    
    echo ""
    print_status "System check completed"
}

# Main execution
main() {
    print_header "🚀 Starting RHEL Email Server Setup"
    
    check_root
    check_rhel_version
    update_system
    install_docker
    install_docker_compose
    configure_firewall
    stop_conflicting_services
    install_ssl_tools
    create_directory_structure
    create_email_user
    setup_monitoring
    create_maintenance_scripts
    setup_log_rotation
    setup_backup_system
    optimize_network
    apply_security_hardening
    final_system_check
    
    print_header "🎉 RHEL Email Server Setup Complete!"
    echo ""
    print_status "Your RHEL VM is now ready for email server deployment"
    print_status "Email server directory: $HOME/investra-email-server"
    echo ""
    print_status "Next steps:"
    echo "1. Configure GitHub secrets for automated deployment"
    echo "2. Run the GitHub Actions workflow to deploy the email server"
    echo "3. Configure DNS records for your domain"
    echo "4. Test email reception and processing"
    echo ""
    print_status "For automated deployment, see: GITHUB_SECRETS_SETUP.md"
    print_warning "Remember to log out and back in for docker group membership to take effect"
}

# Run main function
main "$@"
