#!/bin/bash
set -e

# This script deploys new code to the existing EC2 instance
# It should be run from the CI/CD pipeline after any changes

# Parameters
EC2_HOST="$1"
SSH_KEY="$2"

if [ -z "$EC2_HOST" ] || [ -z "$SSH_KEY" ]; then
  echo "Usage: $0 <ec2-host> <ssh-key-path>"
  exit 1
fi

echo "Deploying to $EC2_HOST..."

# Create a temporary file for the SSH key
SSH_KEY_FILE=$(mktemp)
echo "$SSH_KEY" > "$SSH_KEY_FILE"
chmod 600 "$SSH_KEY_FILE"

# Deploy commands
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_FILE" ec2-user@"$EC2_HOST" << 'EOF'
  cd ~/app

  # Pull latest code
  git pull

  # Install/update dependencies
  npm install

  # Build frontend and backend
  npm run build:backend
  npm run build:frontend

  # Copy frontend to nginx serving directory
  sudo cp -r apps/frontend/out/* /usr/share/nginx/html/

  # Restart backend
  pm2 restart backend || pm2 start "npm run start:prod:backend" --name backend

  # Reload nginx if needed
  sudo systemctl reload nginx

  echo "Deployment completed!"
EOF

# Clean up
rm "$SSH_KEY_FILE"

echo "Deployment script executed successfully!"
