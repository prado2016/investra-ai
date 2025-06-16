# Self-Hosted GitHub Runner Setup

## Install GitHub Runner on your VM or local machine

1. Go to your GitHub repo → Settings → Actions → Runners
2. Click "New self-hosted runner"
3. Follow the setup instructions for Linux
4. Run the runner on a machine that can reach 10.0.0.89

## Update workflow to use self-hosted runner

```yaml
jobs:
  deploy-dev-email-server:
    runs-on: self-hosted  # Instead of ubuntu-latest
    environment: development
```

This way the workflow runs on your network and can reach the VM.
