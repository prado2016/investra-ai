# Enhanced deployment script for CI/CD
# This handles the nginx user issue automatically

# Detect web server user
if id "nginx" &>/dev/null; then
    WEB_USER="nginx"
    WEB_GROUP="nginx"
elif id "www-data" &>/dev/null; then
    WEB_USER="www-data"
    WEB_GROUP="www-data"
elif id "apache" &>/dev/null; then
    WEB_USER="apache"
    WEB_GROUP="apache"
else
    # Fallback to current user
    WEB_USER=$(whoami)
    WEB_GROUP=$(id -gn)
    echo "⚠️  No standard web server user found. Using: $WEB_USER:$WEB_GROUP"
fi

echo "🔍 Detected web user: $WEB_USER:$WEB_GROUP"

# Backup current deployment if it exists
if [ -d "/var/www/investra-ai/current" ]; then
    echo "📦 Creating backup..."
    sudo mv /var/www/investra-ai/current /var/www/investra-ai/backup-$(date +%Y%m%d-%H%M%S)
fi

# Move new deployment to final location
echo "🚀 Deploying new version..."
sudo mv /tmp/investra-ai-deploy /var/www/investra-ai/current

# Set ownership and permissions with detected user
echo "🔧 Setting ownership to $WEB_USER:$WEB_GROUP"
sudo chown -R "$WEB_USER:$WEB_GROUP" /var/www/investra-ai/current
sudo chmod -R 755 /var/www/investra-ai/current

# Create/update Nginx configuration (only if nginx is available)
if command -v nginx &> /dev/null; then
    echo "⚙️  Configuring Nginx..."
    sudo tee /etc/nginx/conf.d/investra-ai.conf > /dev/null << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    root /var/www/investra-ai/current;
    index index.html;

    # Enable compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

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
}
NGINX_EOF

    # Test and reload Nginx
    echo "🧪 Testing Nginx configuration..."
    if sudo nginx -t; then
        echo "🔄 Reloading Nginx..."
        sudo systemctl reload nginx
        echo "✅ Nginx configuration successful!"
    else
        echo "❌ Nginx configuration test failed!"
        exit 1
    fi
else
    echo "⚠️  Nginx not found. Skipping web server configuration."
fi

# Clean up old backups (keep last 5)
echo "🧹 Cleaning up old backups..."
sudo find /var/www/investra-ai -name "backup-*" -type d | sort -r | tail -n +6 | xargs -r sudo rm -rf

# Display deployment info
echo ""
echo "🎉 Investra AI deployed successfully!"
echo "📁 Deployed to: /var/www/investra-ai/current"
echo "🌐 Available at: http://$(hostname -I | awk '{print $1}' || echo 'localhost')"
echo "📊 Build size: $(du -sh /var/www/investra-ai/current 2>/dev/null || echo 'Unknown')"
echo "👤 Owner: $WEB_USER:$WEB_GROUP"
