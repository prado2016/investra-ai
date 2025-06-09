#!/bin/bash

# Investra AI Web Deployment Script
# This script deploys the built application to a web server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect the system and web server user
detect_web_user() {
    local web_user=""
    local web_group=""
    
    # Check for common web server users
    if id "nginx" &>/dev/null; then
        web_user="nginx"
        web_group="nginx"
    elif id "www-data" &>/dev/null; then
        web_user="www-data"
        web_group="www-data"
    elif id "apache" &>/dev/null; then
        web_user="apache"
        web_group="apache"
    elif id "httpd" &>/dev/null; then
        web_user="httpd"
        web_group="httpd"
    else
        # Fallback to current user if no web user found
        web_user=$(whoami)
        web_group=$(id -gn)
        print_warning "No standard web server user found. Using current user: $web_user:$web_group"
    fi
    
    echo "$web_user:$web_group"
}

# Function to detect web server type
detect_web_server() {
    if command -v nginx &> /dev/null; then
        echo "nginx"
    elif command -v apache2 &> /dev/null; then
        echo "apache2"
    elif command -v httpd &> /dev/null; then
        echo "httpd"
    else
        echo "unknown"
    fi
}

# Configuration
DEPLOY_DIR="/var/www/investra-ai"
SOURCE_DIR="/tmp/investra-ai-deploy"
CURRENT_DIR="$DEPLOY_DIR/current"
BACKUP_PREFIX="backup"

print_status "Starting Investra AI deployment..."

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    print_error "Source directory $SOURCE_DIR not found!"
    print_error "Please ensure the build artifacts are copied to $SOURCE_DIR first."
    exit 1
fi

# Detect web user and server
WEB_USER_INFO=$(detect_web_user)
WEB_USER=$(echo $WEB_USER_INFO | cut -d':' -f1)
WEB_GROUP=$(echo $WEB_USER_INFO | cut -d':' -f2)
WEB_SERVER=$(detect_web_server)

print_status "Detected web user: $WEB_USER:$WEB_GROUP"
print_status "Detected web server: $WEB_SERVER"

# Create deployment directory if it doesn't exist
if [ ! -d "$DEPLOY_DIR" ]; then
    print_status "Creating deployment directory: $DEPLOY_DIR"
    sudo mkdir -p "$DEPLOY_DIR"
fi

# Backup current deployment if it exists
if [ -d "$CURRENT_DIR" ]; then
    BACKUP_NAME="$BACKUP_PREFIX-$(date +%Y%m%d-%H%M%S)"
    BACKUP_PATH="$DEPLOY_DIR/$BACKUP_NAME"
    print_status "Backing up current deployment to: $BACKUP_PATH"
    sudo mv "$CURRENT_DIR" "$BACKUP_PATH"
fi

# Move new deployment to final location
print_status "Moving new deployment to: $CURRENT_DIR"
sudo mv "$SOURCE_DIR" "$CURRENT_DIR"

# Set ownership and permissions
print_status "Setting ownership to $WEB_USER:$WEB_GROUP"
sudo chown -R "$WEB_USER:$WEB_GROUP" "$CURRENT_DIR"

print_status "Setting permissions"
sudo chmod -R 755 "$CURRENT_DIR"

# Configure web server based on detected type
configure_nginx() {
    print_status "Configuring Nginx..."
    
    sudo tee /etc/nginx/conf.d/investra-ai.conf > /dev/null << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    root /var/www/investra-ai/current;
    index index.html;

    # Enable compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Handle React Router (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # API proxy (if needed)
    location /api/ {
        # Uncomment and configure if you have a backend API
        # proxy_pass http://localhost:3001;
        # proxy_http_version 1.1;
        # proxy_set_header Upgrade $http_upgrade;
        # proxy_set_header Connection 'upgrade';
        # proxy_set_header Host $host;
        # proxy_cache_bypass $http_upgrade;
        return 404;
    }
}
NGINX_EOF

    # Test Nginx configuration
    print_status "Testing Nginx configuration..."
    if sudo nginx -t; then
        print_status "Reloading Nginx..."
        sudo systemctl reload nginx
        return 0
    else
        print_error "Nginx configuration test failed!"
        return 1
    fi
}

configure_apache() {
    print_status "Configuring Apache..."
    
    local apache_conf_dir="/etc/apache2/sites-available"
    if [ ! -d "$apache_conf_dir" ]; then
        apache_conf_dir="/etc/httpd/conf.d"
    fi
    
    sudo tee "$apache_conf_dir/investra-ai.conf" > /dev/null << 'APACHE_EOF'
<VirtualHost *:80>
    DocumentRoot /var/www/investra-ai/current
    DirectoryIndex index.html

    <Directory /var/www/investra-ai/current>
        AllowOverride None
        Require all granted
        
        # Handle React Router (SPA routing)
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Cache static assets
    <LocationMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
        ExpiresActive On
        ExpiresDefault "access plus 1 year"
        Header append Cache-Control "public, immutable"
    </LocationMatch>

    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # Health check
    Alias /health /var/www/investra-ai/current/health.txt
</VirtualHost>
APACHE_EOF

    # Create health check file
    echo "healthy" | sudo tee "$CURRENT_DIR/health.txt" > /dev/null

    # Enable site and restart Apache
    if command -v a2ensite &> /dev/null; then
        sudo a2ensite investra-ai
        sudo systemctl reload apache2
    else
        sudo systemctl reload httpd
    fi
}

# Configure web server
case "$WEB_SERVER" in
    "nginx")
        if ! configure_nginx; then
            exit 1
        fi
        ;;
    "apache2"|"httpd")
        configure_apache
        ;;
    *)
        print_warning "Unknown web server. Skipping web server configuration."
        print_warning "Please configure your web server manually to serve files from: $CURRENT_DIR"
        ;;
esac

# Clean up old backups (keep last 5)
print_status "Cleaning up old backups..."
sudo find "$DEPLOY_DIR" -name "$BACKUP_PREFIX-*" -type d | sort -r | tail -n +6 | xargs -r sudo rm -rf

# Display deployment info
print_success "Investra AI deployed successfully!"
echo ""
echo "📁 Deployed to: $CURRENT_DIR"
echo "🌐 Available at: http://$(hostname -I | awk '{print $1}' || echo 'localhost')"
echo "📊 Build size: $(du -sh "$CURRENT_DIR" 2>/dev/null || echo 'Unknown')"
echo "👤 Owner: $WEB_USER:$WEB_GROUP"
echo "🔧 Web server: $WEB_SERVER"

# Verify deployment
if [ -f "$CURRENT_DIR/index.html" ]; then
    print_success "index.html found - deployment appears successful"
else
    print_error "index.html not found - deployment may have failed"
    exit 1
fi

print_status "Deployment completed!"
