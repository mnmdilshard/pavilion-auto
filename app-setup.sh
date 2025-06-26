#!/bin/bash

# Application setup script - Run this on EC2 after uploading code
# Navigate to your app directory first: cd /var/www/pavilion-app

echo "Installing application dependencies..."

# Install server dependencies
npm install

# Install client dependencies and build
cd client
npm install
npm run build
cd ..

# Create production environment file
cat > .env << EOF
NODE_ENV=production
PORT=3001
JWT_SECRET=pavilion_auto_secret_key_2025
EOF

# Set proper permissions
chmod 600 .env

# Initialize database (if schema exists)
if [ -f "schema.sql" ]; then
    echo "Database schema found. Make sure to initialize it manually."
fi

echo "Application setup completed!"
echo "Ready to configure nginx and start with PM2"
