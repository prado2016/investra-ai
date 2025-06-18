# Self-Hosted GitHub Runner Setup Guide

This guide explains how to set up and configure a self-hosted GitHub Actions runner on your RHEL server for the email server deployment.

## Overview

The updated workflow now runs directly on your RHEL server instead of using SSH connections from GitHub's hosted runners. This eliminates all SSH complexity and provides better performance and reliability.

## Prerequisites

- RHEL/CentOS/Rocky Linux server with sudo access
- GitHub repository with Actions enabled
- Internet connectivity for downloading runner software

## Required GitHub Secrets

Since we're now using a self-hosted runner, you only need these secrets:

- `EMAIL_PASSWORD` - Password for the email account
- `ADMIN_EMAIL` - Administrator email for SSL certificates
- `STAGING_EMAIL_PASSWORD` (optional) - For staging environment
- `DEV_EMAIL_PASSWORD` (optional) - For development environment

**Note**: You no longer need `RHEL_HOST`, `RHEL_USER`, or `RHEL_SSH_KEY` secrets!

## Step 1: Install GitHub Actions Runner

### 1.1 Download and Install Runner

Connect to your RHEL server and run:

```bash
# Create a folder for the runner
mkdir actions-runner && cd actions-runner

# Download the latest runner (check GitHub for current version)
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract the installer
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
```

### 1.2 Get Registration Token

1. Go to your GitHub repository
2. Navigate to **Settings** → **Actions** → **Runners**
3. Click **New self-hosted runner**
4. Select **Linux** and **x64**
5. Copy the registration token from the configuration command

### 1.3 Configure the Runner

```bash
# Configure the runner (replace TOKEN with your actual token)
./config.sh --url https://github.com/YOUR_USERNAME/investra-ai --token YOUR_TOKEN

# When prompted:
# - Enter a name for the runner (e.g., "rhel-email-server")
# - Enter runner group: press Enter for default
# - Enter labels: "self-hosted,linux,email-server" (optional)
# - Enter work folder: press Enter for default
```

### 1.4 Install Runner as a Service

```bash
# Install the service
sudo ./svc.sh install

# Start the service
sudo ./svc.sh start

# Check status
sudo ./svc.sh status
```

## Step 2: Configure Server Dependencies

### 2.1 Install Required Packages

The workflow will install Podman automatically, but you can pre-install:

```bash
sudo dnf update -y
sudo dnf install -y podman podman-compose podman-docker git
```

### 2.2 Configure User Permissions

```bash
# Enable lingering for the runner user
sudo loginctl enable-linger $(whoami)

# Start user podman socket
systemctl --user enable podman.socket
systemctl --user start podman.socket
```

### 2.3 Configure Firewall

```bash
# For firewalld (RHEL/CentOS)
sudo firewall-cmd --permanent --add-service=smtp
sudo firewall-cmd --permanent --add-service=smtp-submission
sudo firewall-cmd --permanent --add-service=imaps
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# For systems with iptables
sudo iptables -A INPUT -p tcp --dport 25 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 587 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 993 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
```

## Step 3: Verify Runner Setup

### 3.1 Check Runner Status

1. Go to your GitHub repository
2. Navigate to **Settings** → **Actions** → **Runners**
3. Verify your runner appears as "Idle" and "Online"

### 3.2 Test Runner

Create a simple test workflow to verify the runner works:

```yaml
name: Test Self-Hosted Runner
on: workflow_dispatch

jobs:
  test:
    runs-on: self-hosted
    steps:
    - uses: actions/checkout@v4
    - name: Test runner
      run: |
        echo "Runner hostname: $(hostname)"
        echo "Runner user: $(whoami)"
        echo "Runner directory: $(pwd)"
        podman --version || echo "Podman not installed"
```

## Step 4: Deploy Email Server

### 4.1 Set GitHub Secrets

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these repository secrets:
   - `EMAIL_PASSWORD`: Password for transactions@investra.com
   - `ADMIN_EMAIL`: Your administrator email address

### 4.2 Trigger Deployment

1. Go to **Actions** tab in your repository
2. Select "Deploy Email Server (Self-Hosted)" workflow
3. Click **Run workflow**
4. Select environment (development/staging/production)
5. Click **Run workflow**

## Step 5: Monitor Deployment

### 5.1 Watch Workflow Progress

The workflow will:
1. ✅ Install Podman and dependencies
2. ✅ Configure firewall rules
3. ✅ Copy email server files
4. ✅ Generate SSL certificates
5. ✅ Start email services
6. ✅ Run connectivity tests
7. ✅ Set up monitoring and backups

### 5.2 Verify Email Server

After deployment, check:

```bash
# Check containers are running
cd ~/investra-email-server
podman compose ps

# Check ports are listening
ss -tlnp | grep -E ':(25|587|993|8080)'

# Check logs
podman compose logs mailserver

# Run monitoring script
./monitor-email.sh
```

## Benefits of Self-Hosted Runner

### ✅ Advantages
- **No SSH complexity** - Runs directly on server
- **Better performance** - No network latency
- **More reliable** - No SSH connection issues
- **Easier debugging** - Direct access to logs
- **Cost effective** - Uses your own compute resources
- **Better security** - No external SSH access needed

### ⚠️ Considerations
- Runner needs internet access for GitHub
- Server must be online for deployments
- You're responsible for runner maintenance
- Runner has full access to the server

## Troubleshooting

### Runner Not Appearing in GitHub

```bash
# Check service status
sudo ./svc.sh status

# Check logs
sudo journalctl -u actions.runner.*.service -f

# Restart service
sudo ./svc.sh stop
sudo ./svc.sh start
```

### Deployment Failures

```bash
# Check runner logs
sudo journalctl -u actions.runner.*.service -f

# Check email server logs
cd ~/investra-email-server
podman compose logs

# Check system resources
df -h
free -h
```

### Workflow Not Running on Self-Hosted

1. Verify runner labels match workflow requirements
2. Check runner is online in GitHub settings
3. Ensure no other workflows are using the runner

## Security Best Practices

1. **Isolate the runner**: Use a dedicated user account
2. **Limit permissions**: Don't run runner as root
3. **Monitor access**: Review runner logs regularly
4. **Keep updated**: Update runner software regularly
5. **Backup configs**: Backup runner configuration

## Next Steps

After successful deployment:

1. **Update DNS**: Point MX record to server IP
2. **Test email**: Send test emails to verify
3. **Monitor**: Use the monitoring script regularly
4. **Backup**: Verify backup script works
5. **Document**: Keep deployment notes updated

## Support

If you encounter issues:

1. Check runner logs: `sudo journalctl -u actions.runner.*.service`
2. Check email server logs: `cd ~/investra-email-server && podman compose logs`
3. Review workflow run logs in GitHub Actions tab
4. Verify all required secrets are set in GitHub repository settings

The self-hosted runner approach is much simpler and more reliable than SSH-based deployment!
