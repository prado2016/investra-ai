#!/bin/bash
# Test script to verify Podman installation and email server deployment

echo "=== Testing Podman Email Server Setup ==="
echo "Date: $(date)"
echo ""

# Test 1: Check if Podman is installed
echo "1. Checking Podman installation..."
if command -v podman &> /dev/null; then
    echo "✅ Podman is installed: $(podman --version)"
else
    echo "❌ Podman not found, installing..."
    sudo dnf install -y podman podman-compose podman-docker
    sudo loginctl enable-linger $USER
fi

# Test 2: Check if podman-compose is available
echo ""
echo "2. Checking podman-compose..."
if command -v podman-compose &> /dev/null; then
    echo "✅ podman-compose is available: $(podman-compose --version)"
else
    echo "⚠️  podman-compose not found, trying pip install..."
    pip3 install podman-compose || echo "Note: podman-compose may need manual installation"
fi

# Test 3: Test basic podman functionality
echo ""
echo "3. Testing basic Podman functionality..."
podman run --rm hello-world || echo "Note: Unable to test with hello-world image"

# Test 4: Check email server directory
echo ""
echo "4. Checking email server setup..."
if [ -f "docker-compose.yml" ]; then
    echo "✅ Docker compose file found"
    echo "Services defined:"
    grep "services:" -A 10 docker-compose.yml | grep -E "^\s+[a-z]" | sed 's/://g'
else
    echo "❌ docker-compose.yml not found in current directory"
fi

# Test 5: Check required ports
echo ""
echo "5. Checking port availability..."
for port in 25 587 993 8080; do
    if ss -tlnp | grep ":$port " > /dev/null; then
        echo "⚠️  Port $port is already in use"
    else
        echo "✅ Port $port is available"
    fi
done

# Test 6: Check firewall status
echo ""
echo "6. Checking firewall configuration..."
if command -v firewall-cmd &> /dev/null; then
    if systemctl is-active --quiet firewalld; then
        echo "✅ Firewalld is active"
        echo "Open ports: $(sudo firewall-cmd --list-ports)"
    else
        echo "⚠️  Firewalld is not active"
    fi
else
    echo "⚠️  Firewalld not found"
fi

echo ""
echo "=== Test Complete ==="
