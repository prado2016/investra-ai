#!/bin/bash

# SSL Certificate Setup Script for Investra AI Email Server
# Supports multiple Linux distributions and fallback options

set -e

# Configuration
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@investra.com}"
HOSTNAME="${HOSTNAME:-mail.investra.com}"
EMAIL_DOMAIN="${EMAIL_DOMAIN:-investra.com}"

echo "🔒 Setting up SSL certificates for $HOSTNAME..."
echo "📧 Admin email: $ADMIN_EMAIL"

# Create certificate directory
echo "📁 Creating certificate directory..."
mkdir -p docker-data/dms/certs/$HOSTNAME

# Function to detect Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo $ID
    elif type lsb_release >/dev/null 2>&1; then
        lsb_release -si | tr '[:upper:]' '[:lower:]'
    elif [ -f /etc/redhat-release ]; then
        echo "rhel"
    else
        echo "unknown"
    fi
}

# Function to install certbot based on distribution
install_certbot() {
    local distro=$(detect_distro)
    echo "🐧 Detected distribution: $distro"
    
    case $distro in
        "ubuntu"|"debian")
            echo "📦 Installing certbot for Debian/Ubuntu..."
            sudo apt-get update
            sudo apt-get install -y certbot
            ;;
        "rhel"|"centos"|"rocky"|"almalinux")
            echo "📦 Installing certbot for RHEL/CentOS..."
            # Enable EPEL repository
            if command -v dnf &> /dev/null; then
                # Try different methods to enable EPEL
                if ! sudo dnf install -y epel-release 2>/dev/null; then
                    echo "ℹ️ Standard EPEL installation failed, trying CRB repository..."
                    sudo dnf config-manager --set-enabled crb 2>/dev/null || sudo dnf config-manager --set-enabled powertools 2>/dev/null || true
                    sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm 2>/dev/null || \
                    sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-8.noarch.rpm 2>/dev/null || \
                    echo "⚠️ EPEL installation failed, trying snapd as fallback..."
                fi
                
                # Try to install certbot
                if ! sudo dnf install -y certbot 2>/dev/null; then
                    echo "ℹ️ DNF certbot installation failed, trying snapd..."
                    if sudo dnf install -y snapd; then
                        sudo systemctl enable --now snapd.socket
                        sudo ln -s /var/lib/snapd/snap /snap 2>/dev/null || true
                        sudo snap install certbot --classic
                        sudo ln -s /snap/bin/certbot /usr/bin/certbot 2>/dev/null || true
                    else
                        echo "❌ Failed to install certbot via DNF or snap"
                        return 1
                    fi
                fi
            elif command -v yum &> /dev/null; then
                sudo yum install -y epel-release
                sudo yum install -y certbot
            else
                echo "❌ Neither dnf nor yum package manager found"
                return 1
            fi
            ;;
        "fedora")
            echo "📦 Installing certbot for Fedora..."
            sudo dnf install -y certbot
            ;;
        "arch"|"manjaro")
            echo "📦 Installing certbot for Arch Linux..."
            sudo pacman -S --noconfirm certbot
            ;;
        "opensuse"|"sles")
            echo "📦 Installing certbot for openSUSE..."
            sudo zypper install -y python3-certbot
            ;;
        *)
            echo "❌ Unsupported distribution: $distro"
            echo "ℹ️ Please install certbot manually or use the self-signed certificate option"
            return 1
            ;;
    esac
}

# Function to generate Let's Encrypt certificate
generate_letsencrypt_cert() {
    echo "🔐 Generating Let's Encrypt certificate..."
    
    # Stop any web servers that might be using port 80
    echo "🛑 Stopping web servers..."
    sudo systemctl stop httpd nginx apache2 lighttpd caddy 2>/dev/null || true
    sudo pkill -f "python.*http.server" 2>/dev/null || true
    
    # Generate certificate using standalone mode
    if sudo certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "$ADMIN_EMAIL" \
        --domains "$HOSTNAME" \
        --keep-until-expiring \
        --expand; then
        
        echo "✅ Let's Encrypt certificate generated successfully"
        
        # Copy certificates to docker directory
        if [ -d "/etc/letsencrypt/live/$HOSTNAME" ]; then
            echo "📋 Copying certificates to docker directory..."
            sudo cp /etc/letsencrypt/live/$HOSTNAME/* docker-data/dms/certs/$HOSTNAME/
            sudo chown -R $(whoami):$(whoami) docker-data/dms/certs/
            echo "✅ Certificates copied successfully"
            return 0
        else
            echo "❌ Certificate directory not found: /etc/letsencrypt/live/$HOSTNAME"
            return 1
        fi
    else
        echo "❌ Let's Encrypt certificate generation failed"
        return 1
    fi
}

# Function to generate self-signed certificate as fallback
generate_selfsigned_cert() {
    echo "🔐 Generating self-signed certificate as fallback..."
    
    # Ensure OpenSSL is available
    if ! command -v openssl &> /dev/null; then
        echo "📦 Installing OpenSSL..."
        local distro=$(detect_distro)
        case $distro in
            "ubuntu"|"debian")
                sudo apt-get update && sudo apt-get install -y openssl
                ;;
            "rhel"|"centos"|"rocky"|"almalinux"|"fedora")
                if command -v dnf &> /dev/null; then
                    sudo dnf install -y openssl
                else
                    sudo yum install -y openssl
                fi
                ;;
            "arch"|"manjaro")
                sudo pacman -S --noconfirm openssl
                ;;
            "opensuse"|"sles")
                sudo zypper install -y openssl
                ;;
            *)
                echo "❌ Could not install OpenSSL automatically for $distro"
                echo "💡 Please install OpenSSL manually: openssl"
                return 1
                ;;
        esac
        
        if ! command -v openssl &> /dev/null; then
            echo "❌ OpenSSL installation failed"
            return 1
        fi
    fi
    
    # Create private key
    openssl genrsa -out docker-data/dms/certs/$HOSTNAME/privkey.pem 2048
    
    # Create certificate signing request
    openssl req -new \
        -key docker-data/dms/certs/$HOSTNAME/privkey.pem \
        -out docker-data/dms/certs/$HOSTNAME/cert.csr \
        -subj "/C=US/ST=California/L=San Francisco/O=Investra AI/OU=IT Department/CN=$HOSTNAME"
    
    # Create self-signed certificate (valid for 1 year)
    openssl x509 -req \
        -in docker-data/dms/certs/$HOSTNAME/cert.csr \
        -signkey docker-data/dms/certs/$HOSTNAME/privkey.pem \
        -out docker-data/dms/certs/$HOSTNAME/cert.pem \
        -days 365 \
        -extensions v3_req \
        -extfile <(echo "[v3_req]"; echo "subjectAltName=DNS:$HOSTNAME,DNS:$EMAIL_DOMAIN")
    
    # Create fullchain (just the cert for self-signed)
    cp docker-data/dms/certs/$HOSTNAME/cert.pem docker-data/dms/certs/$HOSTNAME/fullchain.pem
    
    # Clean up CSR
    rm docker-data/dms/certs/$HOSTNAME/cert.csr
    
    echo "✅ Self-signed certificate generated"
    echo "⚠️ NOTE: Self-signed certificates will show security warnings in email clients"
    echo "⚠️ For production use, consider using Let's Encrypt or a commercial CA"
}

# Function to check if certificates exist and are valid
check_existing_certs() {
    if [ -f "docker-data/dms/certs/$HOSTNAME/fullchain.pem" ] && [ -f "docker-data/dms/certs/$HOSTNAME/privkey.pem" ]; then
        echo "📋 Existing certificates found"
        
        # Check if certificate is still valid (not expired)
        if openssl x509 -in docker-data/dms/certs/$HOSTNAME/fullchain.pem -noout -checkend 86400; then
            echo "✅ Existing certificate is valid (expires in more than 1 day)"
            return 0
        else
            echo "⚠️ Existing certificate is expired or expires soon"
            return 1
        fi
    else
        echo "📋 No existing certificates found"
        return 1
    fi
}

# Function to set up certificate renewal cron job
setup_renewal_cron() {
    echo "⏰ Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > docker-data/dms/renew-certs.sh << 'EOF'
#!/bin/bash
# Automatic certificate renewal script
HOSTNAME="mail.investra.com"

echo "🔄 Checking for certificate renewal..."
sudo certbot renew --quiet

if [ -d "/etc/letsencrypt/live/$HOSTNAME" ]; then
    echo "📋 Updating docker certificates..."
    sudo cp /etc/letsencrypt/live/$HOSTNAME/* docker-data/dms/certs/$HOSTNAME/
    sudo chown -R $(whoami):$(whoami) docker-data/dms/certs/
    
    # Restart mailserver to use new certificates
    if command -v docker-compose &> /dev/null; then
        docker-compose restart mailserver
    elif command -v docker &> /dev/null; then
        docker restart $(docker ps -q --filter "name=mailserver")
    fi
    
    echo "✅ Certificate renewal complete"
else
    echo "❌ Certificate directory not found"
fi
EOF

    chmod +x docker-data/dms/renew-certs.sh
    
    # Add to crontab (run twice daily)
    (crontab -l 2>/dev/null; echo "0 2,14 * * * cd $(pwd) && ./docker-data/dms/renew-certs.sh >> docker-data/dms/renewal.log 2>&1") | crontab -
    
    echo "✅ Automatic renewal configured (runs twice daily at 2 AM and 2 PM)"
}

# Main execution
main() {
    echo "🔍 Checking for existing certificates..."
    
    if check_existing_certs; then
        echo "✅ Valid certificates already exist. Skipping generation."
        echo "💡 To force regeneration, delete the docker-data/dms/certs/$HOSTNAME/ directory"
        exit 0
    fi
    
    echo ""
    echo "🔐 Certificate generation options:"
    echo "1. Let's Encrypt (recommended for production)"
    echo "2. Self-signed certificate (for testing/development)"
    echo "3. Skip SSL setup (use existing certificates)"
    echo ""
    
    # For automated environments, try Let's Encrypt first, then fallback
    if [ -n "$CI" ] || [ "$1" = "auto" ]; then
        echo "🤖 Automated mode: trying Let's Encrypt first..."
        if ! command -v certbot &> /dev/null; then
            echo "📦 Installing certbot..."
            if ! install_certbot; then
                echo "❌ Failed to install certbot, using self-signed certificate"
                generate_selfsigned_cert
                return 0
            fi
        fi
        
        if generate_letsencrypt_cert; then
            setup_renewal_cron
        else
            echo "🔄 Let's Encrypt failed, falling back to self-signed certificate..."
            generate_selfsigned_cert
        fi
        
        return 0
    fi
    
    # Interactive mode
    read -p "Choose option (1-3): " choice
    
    case $choice in
        1)
            # Let's Encrypt
            if ! command -v certbot &> /dev/null; then
                echo "📦 Installing certbot..."
                if ! install_certbot; then
                    echo "❌ Failed to install certbot"
                    exit 1
                fi
            fi
            
            if generate_letsencrypt_cert; then
                setup_renewal_cron
            else
                echo "❌ Let's Encrypt certificate generation failed"
                echo "💡 You can try the self-signed option or check your DNS configuration"
                exit 1
            fi
            ;;
        2)
            # Self-signed
            if ! command -v openssl &> /dev/null; then
                echo "❌ OpenSSL not found. Please install OpenSSL first."
                exit 1
            fi
            generate_selfsigned_cert
            ;;
        3)
            # Skip
            echo "⏭️ Skipping SSL setup"
            echo "💡 Make sure to place your certificates in docker-data/dms/certs/$HOSTNAME/"
            echo "   Required files: fullchain.pem, privkey.pem"
            ;;
        *)
            echo "❌ Invalid option"
            exit 1
            ;;
    esac
}

# Verify certificate files are present
verify_certificates() {
    echo ""
    echo "🔍 Verifying certificate setup..."
    
    if [ -f "docker-data/dms/certs/$HOSTNAME/fullchain.pem" ] && [ -f "docker-data/dms/certs/$HOSTNAME/privkey.pem" ]; then
        echo "✅ Certificate files found:"
        echo "   - docker-data/dms/certs/$HOSTNAME/fullchain.pem"
        echo "   - docker-data/dms/certs/$HOSTNAME/privkey.pem"
        
        # Show certificate details
        echo ""
        echo "📋 Certificate details:"
        openssl x509 -in docker-data/dms/certs/$HOSTNAME/fullchain.pem -noout -subject -dates -issuer
        
        echo ""
        echo "✅ SSL certificate setup complete!"
        echo ""
        echo "📋 Next steps:"
        echo "1. Start the email server: ./start-mailserver.sh"
        echo "2. Test SSL connection: openssl s_client -connect $HOSTNAME:993"
        echo "3. Check email server logs: docker-compose logs mailserver"
    else
        echo "❌ Certificate files not found"
        echo "💡 Please run this script again or manually place certificates in docker-data/dms/certs/$HOSTNAME/"
        exit 1
    fi
}

# Run main function
main "$@"
verify_certificates
