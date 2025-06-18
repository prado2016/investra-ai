#!/bin/bash

# Email Server Startup Script - Handles Podman Compose compatibility issues
# Supports both native podman-compose and docker-compose backends

set -e

echo "🚀 Starting Investra Email Server"

# Configuration
EMAIL_DOMAIN="${EMAIL_DOMAIN:-investra.com}"
EMAIL_HOSTNAME="${EMAIL_HOSTNAME:-mail.investra.com}"
EMAIL_USER="${EMAIL_USER:-transactions@investra.com}"

echo "📧 Domain: $EMAIL_DOMAIN"
echo "🌐 Hostname: $EMAIL_HOSTNAME"
echo "👤 User: $EMAIL_USER"

# Function to detect available compose command
detect_compose_command() {
    echo "🔍 Detecting available compose command..."
    
    # Check for podman-compose (native Python implementation)
    if command -v podman-compose &> /dev/null; then
        echo "✅ Found podman-compose (native)"
        echo "podman-compose"
        return 0
    fi
    
    # Check for docker-compose (standalone binary)
    if command -v docker-compose &> /dev/null; then
        # Test if it works with podman
        if CONTAINER_HOST=unix:///run/user/$(id -u)/podman/podman.sock docker-compose version &> /dev/null; then
            echo "✅ Found docker-compose (compatible with podman)"
            echo "docker-compose"
            return 0
        else
            echo "⚠️ Found docker-compose but it's not compatible with podman"
        fi
    fi
    
    # Check for podman compose (built-in subcommand)
    if podman compose version &> /dev/null; then
        echo "✅ Found podman compose (built-in)"
        echo "podman compose"
        return 0
    fi
    
    echo "❌ No compatible compose command found"
    return 1
}

# Function to install podman-compose if needed
install_podman_compose() {
    echo "📦 Installing podman-compose..."
    
    # Detect package manager and install
    if command -v pip3 &> /dev/null; then
        pip3 install --user podman-compose
        export PATH="$HOME/.local/bin:$PATH"
        return 0
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y python3-pip
        pip3 install --user podman-compose
        export PATH="$HOME/.local/bin:$PATH"
        return 0
    elif command -v yum &> /dev/null; then
        sudo yum install -y python3-pip
        pip3 install --user podman-compose
        export PATH="$HOME/.local/bin:$PATH"
        return 0
    elif command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y python3-pip
        pip3 install --user podman-compose
        export PATH="$HOME/.local/bin:$PATH"
        return 0
    else
        echo "❌ Could not install podman-compose automatically"
        return 1
    fi
}

# Function to setup podman environment
setup_podman_environment() {
    echo "🔧 Setting up Podman environment..."
    
    # Ensure podman socket is running
    if ! systemctl --user is-active --quiet podman.socket; then
        echo "🔌 Starting Podman socket..."
        systemctl --user enable podman.socket
        systemctl --user start podman.socket
    fi
    
    # Set environment for docker-compose compatibility
    export DOCKER_HOST="unix:///run/user/$(id -u)/podman/podman.sock"
    export CONTAINER_HOST="$DOCKER_HOST"
    
    echo "✅ Podman environment configured"
}

# Function to create required directories
create_directories() {
    echo "📁 Creating required directories..."
    
    mkdir -p docker-data/dms/mail-data
    mkdir -p docker-data/dms/mail-state
    mkdir -p docker-data/dms/mail-logs
    mkdir -p docker-data/dms/config
    mkdir -p docker-data/dms/certs
    
    # Set proper permissions
    chmod 755 docker-data/dms/mail-data
    chmod 755 docker-data/dms/mail-state
    chmod 755 docker-data/dms/mail-logs
    chmod 755 docker-data/dms/config
    
    echo "✅ Directories created"
}

# Function to verify configuration files
verify_configuration() {
    echo "🔍 Verifying configuration..."
    
    # Check if postfix accounts file exists
    if [ ! -f "docker-data/dms/config/postfix-accounts.cf" ]; then
        echo "⚠️ Postfix accounts file not found, creating default..."
        if [ -n "$EMAIL_PASSWORD" ]; then
            echo "$EMAIL_USER|{PLAIN}$EMAIL_PASSWORD" > docker-data/dms/config/postfix-accounts.cf
            echo "✅ Created postfix accounts with provided password"
        else
            echo "❌ EMAIL_PASSWORD environment variable not set"
            echo "💡 Please set EMAIL_PASSWORD or create docker-data/dms/config/postfix-accounts.cf manually"
            return 1
        fi
    else
        echo "✅ Postfix accounts file exists"
    fi
    
    # Check SSL certificates
    if [ ! -f "docker-data/dms/certs/$EMAIL_HOSTNAME/fullchain.pem" ]; then
        echo "⚠️ SSL certificates not found"
        echo "💡 Run ./setup-ssl.sh to generate certificates"
        
        # Offer to generate self-signed certificates
        if [ "$1" = "auto" ] || [ -n "$CI" ]; then
            echo "🔐 Auto-generating self-signed certificates for testing..."
            HOSTNAME="$EMAIL_HOSTNAME" ./setup-ssl.sh auto || echo "⚠️ SSL setup failed, continuing anyway..."
        fi
    else
        echo "✅ SSL certificates found"
    fi
}

# Function to stop containers gracefully
stop_containers() {
    echo "🛑 Stopping existing containers..."
    
    local compose_cmd="$1"
    
    case "$compose_cmd" in
        "podman-compose")
            podman-compose down 2>/dev/null || true
            ;;
        "docker-compose")
            DOCKER_HOST="$DOCKER_HOST" docker-compose down 2>/dev/null || true
            ;;
        "podman compose")
            podman compose down 2>/dev/null || true
            ;;
    esac
    
    # Also stop any manually started containers
    podman stop mailserver 2>/dev/null || true
    podman rm mailserver 2>/dev/null || true
    
    echo "✅ Containers stopped"
}

# Function to pull latest images
pull_images() {
    echo "📥 Pulling latest images..."
    
    local compose_cmd="$1"
    
    case "$compose_cmd" in
        "podman-compose")
            if ! podman-compose pull; then
                echo "⚠️ podman-compose pull failed, trying manual pull..."
                podman pull ghcr.io/docker-mailserver/docker-mailserver:latest
            fi
            ;;
        "docker-compose")
            if ! DOCKER_HOST="$DOCKER_HOST" docker-compose pull; then
                echo "⚠️ docker-compose pull failed, trying manual pull..."
                podman pull ghcr.io/docker-mailserver/docker-mailserver:latest
            fi
            ;;
        "podman compose")
            if ! podman compose pull; then
                echo "⚠️ podman compose pull failed, trying manual pull..."
                podman pull ghcr.io/docker-mailserver/docker-mailserver:latest
            fi
            ;;
    esac
    
    echo "✅ Images pulled"
}

# Function to start containers
start_containers() {
    echo "🚀 Starting containers..."
    
    local compose_cmd="$1"
    
    case "$compose_cmd" in
        "podman-compose")
            podman-compose up -d
            ;;
        "docker-compose")
            DOCKER_HOST="$DOCKER_HOST" docker-compose up -d
            ;;
        "podman compose")
            podman compose up -d
            ;;
    esac
    
    echo "✅ Containers started"
}

# Function to wait for services and show status
wait_and_show_status() {
    echo "⏳ Waiting for services to start..."
    sleep 30
    
    local compose_cmd="$1"
    
    echo ""
    echo "📊 Container Status:"
    case "$compose_cmd" in
        "podman-compose")
            podman-compose ps
            ;;
        "docker-compose")
            DOCKER_HOST="$DOCKER_HOST" docker-compose ps
            ;;
        "podman compose")
            podman compose ps
            ;;
    esac
    
    echo ""
    echo "🔍 Podman containers:"
    podman ps --filter "name=mailserver" || podman ps
}

# Function to test connectivity
test_connectivity() {
    echo ""
    echo "🧪 Testing connectivity..."
    
    local tests=(
        "25:SMTP"
        "587:SMTP-Submission"
        "993:IMAPS"
        "143:IMAP"
    )
    
    for test in "${tests[@]}"; do
        port="${test%%:*}"
        service="${test##*:}"
        
        if timeout 5 bash -c "</dev/tcp/localhost/$port" 2>/dev/null; then
            echo "✅ $service (port $port)"
        else
            echo "❌ $service (port $port)"
        fi
    done
}

# Main execution
main() {
    # Setup environment
    setup_podman_environment
    
    # Create directories
    create_directories
    
    # Verify configuration
    verify_configuration "$1"
    
    # Detect compose command
    compose_cmd=$(detect_compose_command)
    if [ $? -ne 0 ]; then
        echo "🔧 Attempting to install podman-compose..."
        if install_podman_compose; then
            compose_cmd="podman-compose"
        else
            echo "❌ Failed to setup compose environment"
            exit 1
        fi
    fi
    
    echo "🎯 Using compose command: $compose_cmd"
    
    # Stop existing containers
    stop_containers "$compose_cmd"
    
    # Pull images
    pull_images "$compose_cmd"
    
    # Start containers
    start_containers "$compose_cmd"
    
    # Wait and show status
    wait_and_show_status "$compose_cmd"
    
    # Test connectivity
    test_connectivity
    
    echo ""
    echo "🎉 Email server startup complete!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Check logs: podman logs mailserver"
    echo "2. Test email: telnet $EMAIL_HOSTNAME 25"
    echo "3. Monitor: podman stats mailserver"
    echo "4. Stop: podman stop mailserver"
}

# Handle script arguments
case "${1:-}" in
    "auto")
        echo "🤖 Running in automated mode..."
        main auto
        ;;
    "test")
        echo "🧪 Running connectivity tests only..."
        test_connectivity
        ;;
    "stop")
        echo "🛑 Stopping email server..."
        setup_podman_environment
        compose_cmd=$(detect_compose_command)
        stop_containers "$compose_cmd"
        echo "✅ Email server stopped"
        ;;
    *)
        main
        ;;
esac
