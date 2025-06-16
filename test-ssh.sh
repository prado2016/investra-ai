#!/bin/bash
# Simple test script to verify SSH connection and Podman

echo "Testing SSH connection to lab@10.0.0.89..."

ssh -i ~/.ssh/id_rsa lab@10.0.0.89 "
  echo 'Connected successfully!'
  whoami
  hostname
  
  # Check if Podman is installed
  if command -v podman &> /dev/null; then
    echo 'Podman is already installed:'
    podman --version
  else
    echo 'Podman not found - would install here'
  fi
"

echo "SSH test completed"
