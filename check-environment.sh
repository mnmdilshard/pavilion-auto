#!/bin/bash

# Step-by-step fix script for EC2 deployment
# Run this on your EC2 instance

echo "=== EC2 Deployment Fix Script ==="
echo "Checking current environment..."

# Check if we're in the right location
pwd
ls -la

# Check if Node.js and PM2 are installed
echo ""
echo "Checking installed software:"
echo "Node.js: $(node --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "npm: $(npm --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "PM2: $(pm2 --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "nginx: $(nginx -v 2>&1 || echo 'NOT INSTALLED')"

# Check if application directory exists
echo ""
echo "Checking application directory:"
if [ -d "/var/www/pavilion-app" ]; then
    echo "✓ /var/www/pavilion-app exists"
    ls -la /var/www/pavilion-app
else
    echo "✗ /var/www/pavilion-app does not exist"
    echo "Creating application directory..."
    sudo mkdir -p /var/www/pavilion-app
    sudo chown -R ubuntu:ubuntu /var/www/pavilion-app
    echo "✓ Created /var/www/pavilion-app"
fi

# Check if application files exist
echo ""
echo "Checking for application files:"
if [ -f "/var/www/pavilion-app/server.js" ]; then
    echo "✓ server.js found"
else
    echo "✗ server.js not found - you need to upload your application files"
fi

if [ -d "/var/www/pavilion-app/client" ]; then
    echo "✓ client directory found"
else
    echo "✗ client directory not found - you need to upload your application files"
fi

# Install missing software if needed
echo ""
echo "Installing missing software..."

if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

if ! command -v nginx &> /dev/null; then
    echo "Installing nginx..."
    sudo apt install -y nginx
fi

echo ""
echo "=== Current Status ==="
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "PM2: $(pm2 --version)"
echo "nginx: $(nginx -v 2>&1)"
echo ""
echo "Next steps:"
echo "1. Upload your application files to /var/www/pavilion-app"
echo "2. Run the application setup script"
echo "3. Configure nginx"
echo "4. Start the application"
