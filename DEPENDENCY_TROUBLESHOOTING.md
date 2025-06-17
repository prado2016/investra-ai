# Email Server Dependency Troubleshooting Guide

## 🚨 Missing Dependency Issue Resolution

### Immediate Steps to Diagnose the Issue

1. **SSH into your email server:**
   ```bash
   ssh root@10.0.0.83
   ```

2. **Check what's actually missing:**
   ```bash
   # Check Node.js
   node --version
   npm --version
   
   # Check if the error mentions a specific package
   which node
   which npm
   ```

3. **Common missing dependencies and fixes:**

   **If Node.js is missing:**
   ```bash
   # Install Node.js 18.x
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   apt-get install -y nodejs
   ```

   **If npm packages are missing:**
   ```bash
   # Create project directory
   mkdir -p /opt/investra-email
   cd /opt/investra-email
   
   # Initialize npm project
   npm init -y
   
   # Install email processing dependencies
   npm install imapflow mailparser axios dotenv
   ```

   **If Python is missing (sometimes needed for native modules):**
   ```bash
   apt-get update
   apt-get install -y python3 python3-pip build-essential
   ```

### Specific Dependency Issues and Solutions

#### Issue: "imapflow not found"
```bash
cd /opt/investra-email
npm install imapflow
# Or globally: npm install -g imapflow
```

#### Issue: "mailparser not found"
```bash
cd /opt/investra-email
npm install mailparser
```

#### Issue: "Cannot resolve module"
```bash
# Check current directory has node_modules
ls -la node_modules/
# If missing, run:
npm install
```

#### Issue: "Permission denied"
```bash
# Fix permissions
chown -R root:root /opt/investra-email
chmod -R 755 /opt/investra-email
```

### Test Your Setup

1. **Copy the test file to server:**
   ```bash
   # On your local machine:
   scp test-server-deps.js root@10.0.0.83:/opt/investra-email/
   scp server-package.json root@10.0.0.83:/opt/investra-email/package.json
   ```

2. **Run the test on the server:**
   ```bash
   # On the server:
   cd /opt/investra-email
   npm install
   node test-server-deps.js
   ```

### Quick Server Setup Script

Run this on your server to set up everything:

```bash
#!/bin/bash
# Complete email server dependency setup

# Update system
apt-get update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs build-essential python3

# Create project
mkdir -p /opt/investra-email
cd /opt/investra-email

# Initialize project
cat > package.json << 'EOF'
{
  "name": "investra-email-server",
  "version": "1.0.0",
  "description": "Email processing server for Investra AI",
  "main": "server.js",
  "dependencies": {
    "imapflow": "^1.0.188",
    "mailparser": "^3.7.3",
    "axios": "^1.9.0",
    "dotenv": "^16.0.0"
  }
}
EOF

# Install dependencies
npm install

# Test installation
node -e "console.log('✅ Node.js working'); console.log('✅ Dependencies:', Object.keys(require('./package.json').dependencies).join(', '))"

echo "✅ Email server dependencies installed successfully!"
```

### Debugging Steps

1. **Check the exact error message:**
   - When you see "missing dependency", note the exact package name
   - Look for error messages in terminal/logs

2. **Verify environment:**
   ```bash
   echo $PATH
   which node
   which npm
   node --version
   npm --version
   ```

3. **Check project structure:**
   ```bash
   ls -la /opt/investra-email/
   ls -la /opt/investra-email/node_modules/
   ```

4. **Test specific packages:**
   ```bash
   node -e "console.log(require('imapflow'))"
   node -e "console.log(require('mailparser'))"
   ```

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "node: command not found" | Install Node.js with the setup script above |
| "npm: command not found" | Node.js installation includes npm |
| "Module not found" | Run `npm install` in project directory |
| "Permission denied" | Use `sudo` or fix file permissions |
| "Cannot compile native modules" | Install `build-essential python3` |
| "Network timeout" | Check internet connectivity |

### Emergency Fallback

If nothing works, you can:

1. **Use Docker instead:**
   ```bash
   docker run -d --name email-processor \
     -v /opt/investra-email:/app \
     node:18 \
     sh -c "cd /app && npm install && npm start"
   ```

2. **Install from different source:**
   ```bash
   # Use yarn instead of npm
   npm install -g yarn
   yarn add imapflow mailparser
   ```

3. **Manual installation:**
   ```bash
   # Download and install manually
   wget https://registry.npmjs.org/imapflow/-/imapflow-1.0.188.tgz
   tar -xzf imapflow-1.0.188.tgz
   ```

## 🎯 Quick Actions

**Most likely solution:** SSH into your server and run:
```bash
ssh root@10.0.0.83
mkdir -p /opt/investra-email && cd /opt/investra-email
npm init -y
npm install imapflow mailparser axios
node -e "console.log('✅ Dependencies installed successfully!')"
```

Let me know what specific error message you're seeing and I can provide more targeted help!
