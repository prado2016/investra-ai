#!/usr/bin/env bash
# =============================================================================
# Investra VM Setup Script — run ONCE on a fresh server
# Usage: bash scripts/setup-vm.sh
# Tested on: Ubuntu 22.04 / 24.04
# =============================================================================
set -euo pipefail

APP_DIR="/opt/investra/app"
DATA_DIR="/opt/investra/data"
LOGS_DIR="/opt/investra/logs"
RUNNER_DIR="/opt/actions-runner"
RUNNER_USER="matrix"

echo "=== Investra VM Setup ==="

# ---- 1. System packages ---------------------------------------------------
echo ">> Installing system packages..."
sudo apt-get update -qq
sudo apt-get install -y curl git nginx build-essential python3

# ---- 2. Node.js 22 via NodeSource -----------------------------------------
echo ">> Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version

# ---- 3. PM2 + tsx globally -------------------------------------------------
echo ">> Installing PM2 and tsx..."
sudo npm install -g pm2 tsx
pm2 --version

# ---- 4. Create app directories --------------------------------------------
echo ">> Creating app directories..."
sudo mkdir -p "$APP_DIR" "$DATA_DIR" "$LOGS_DIR"
sudo chown -R "$RUNNER_USER:$RUNNER_USER" /opt/investra

# ---- 5. Nginx config -------------------------------------------------------
echo ">> Configuring nginx..."
sudo cp nginx/investra.conf /etc/nginx/sites-available/investra
sudo ln -sf /etc/nginx/sites-available/investra /etc/nginx/sites-enabled/investra
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
echo "   nginx configured and running"

# ---- 6. PM2 startup --------------------------------------------------------
echo ">> Configuring PM2 startup..."
pm2 startup systemd -u "$RUNNER_USER" --hp "/home/$RUNNER_USER" | tail -1 | sudo bash -
echo "   PM2 will auto-start on boot"

# ---- 7. GitHub Actions self-hosted runner ----------------------------------
# Skip if already installed
if [ -f "$RUNNER_DIR/run.sh" ]; then
  echo ">> GitHub Actions runner already installed at $RUNNER_DIR, skipping"
else
  echo ""
  echo ">> GitHub Actions runner NOT installed."
  echo "   To set it up:"
  echo "   1. Go to: https://github.com/prado2016/investra-ai/settings/actions/runners/new"
  echo "   2. Follow the Linux x64 instructions, install to: $RUNNER_DIR"
  echo "   3. Run as service: sudo ./svc.sh install && sudo ./svc.sh start"
fi

echo ""
echo "=== Setup complete ==="
echo "App dir  : $APP_DIR"
echo "Data dir : $DATA_DIR"
echo "Logs dir : $LOGS_DIR"
echo ""
echo "Next: push code to GitHub and the deploy workflow will handle the rest."
