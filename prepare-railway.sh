#!/bin/bash

# Quick Railway deployment preparation
echo "Preparing for Railway deployment..."

# 1. Create package.json start script for production
npm pkg set scripts.start="node server.js"

# 2. Create .railwayignore (like .gitignore for Railway)
cat > .railwayignore << 'EOF'
node_modules/
client/node_modules/
.git/
*.log
.env.local
.DS_Store
EOF

# 3. Create railway.json for configuration
cat > railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF

# 4. Update package.json to include build steps
cat > build-script.js << 'EOF'
const { execSync } = require('child_process');

console.log('Building client...');
execSync('cd client && npm install && npm run build', { stdio: 'inherit' });
console.log('Client build completed!');
EOF

# Add build script to package.json
npm pkg set scripts.build="node build-script.js"
npm pkg set scripts.railway-build="npm install && npm run build"

echo ""
echo "Railway preparation completed!"
echo ""
echo "Next steps:"
echo "1. Push your code to GitHub"
echo "2. Go to railway.app"
echo "3. Sign up and connect your GitHub repo"
echo "4. Deploy!"
echo ""
echo "Railway will automatically:"
echo "- Detect Node.js"
echo "- Install dependencies" 
echo "- Build your React app"
echo "- Start your server"
