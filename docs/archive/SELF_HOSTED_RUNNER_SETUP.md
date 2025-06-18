# 🏠 Self-Hosted GitHub Runner Setup (No SSH Keys Needed!)

## Why This Is Better

Instead of GitHub Actions connecting TO your server via SSH, run GitHub Actions ON your server directly. This eliminates:
- ❌ SSH key management
- ❌ Network connectivity issues  
- ❌ Secret management complexity
- ❌ Remote authentication problems

## Setup Steps

### 1. Install GitHub Runner on Your RHEL Server

```bash
# SSH into your RHEL server manually (one time setup)
ssh user@your-rhel-server

# Create runner directory
mkdir -p ~/actions-runner && cd ~/actions-runner

# Download the latest runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract it
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Configure the runner
./config.sh --url https://github.com/YOUR_USERNAME/investra-ai --token YOUR_RUNNER_TOKEN
```

### 2. Get Your Runner Token

1. Go to your GitHub repository
2. Navigate to **Settings** → **Actions** → **Runners**
3. Click **"New self-hosted runner"**
4. Select **Linux** and **x64**
5. Copy the token from the configuration command

### 3. Start the Runner

```bash
# Start the runner service
./run.sh

# Or install as a service (recommended)
sudo ./svc.sh install
sudo ./svc.sh start
```

### 4. Update Your Workflow

Change your workflow to use your self-hosted runner:

```yaml
jobs:
  deploy-email-server:
    name: Deploy Email Server
    runs-on: self-hosted  # This runs on YOUR server!
    # Remove all SSH-related steps - not needed anymore!
```

## Benefits

✅ **No SSH keys needed** - runs directly on your server
✅ **No network issues** - everything is local
✅ **Faster deployment** - no file copying over network
✅ **Simpler secrets** - only need email passwords, not SSH keys
✅ **Better security** - no remote access needed

## Simple Deployment Flow

1. **Push code** → GitHub
2. **GitHub triggers** → Your server directly
3. **Your server runs** → Docker commands locally
4. **Done** ✅

This is exactly what you'd want for a self-hosted setup!
