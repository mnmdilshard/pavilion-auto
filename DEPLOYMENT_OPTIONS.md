# Vercel Deployment Guide

## Steps:
1. Push your code to GitHub
2. Go to vercel.com and sign up with GitHub
3. Import your repository
4. Vercel will auto-detect React and build it

## Configuration needed:

### 1. Create vercel.json in your root directory:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    },
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/client/build/$1"
    }
  ]
}
```

### 2. Add to client/package.json scripts:
```json
"vercel-build": "npm run build"
```

### 3. Environment variables in Vercel dashboard:
- NODE_ENV=production
- JWT_SECRET=your_secret_key

## Limitations:
- SQLite doesn't work (need to use PostgreSQL/MongoDB)
- Serverless functions have execution time limits

# Railway Deployment Guide

## Steps:
1. Push code to GitHub
2. Go to railway.app and sign up
3. Deploy from GitHub repo
4. Railway auto-detects Node.js

## Configuration:

### 1. Create railway.json:
```json
{
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### 2. Set environment variables in Railway dashboard:
- NODE_ENV=production
- PORT=3001
- JWT_SECRET=your_secret_key

### 3. Railway provides:
- Automatic HTTPS
- Custom domains
- Built-in database options
- Easy scaling

## Pros:
- Supports SQLite and other databases
- Very easy deployment
- Great for development and production
- Generous free tier

# Render Deployment Guide

## Steps:
1. Push to GitHub
2. Go to render.com and connect GitHub
3. Create a "Web Service" for your app

## Configuration:

### 1. Build Command:
```bash
npm install && cd client && npm install && npm run build
```

### 2. Start Command:
```bash
npm start
```

### 3. Environment Variables:
- NODE_ENV=production
- PORT=10000 (Render default)
- JWT_SECRET=your_secret_key

### 4. Static Files:
Render automatically serves static files from client/build

## Pros:
- Completely free tier
- Automatic SSL
- Custom domains
- Supports databases
- Easy CI/CD

# Netlify + Heroku Deployment Guide

## Frontend (React) on Netlify:
1. Push client code to separate GitHub repo
2. Connect to Netlify
3. Build command: `npm run build`
4. Publish directory: `build`

## Backend (Node.js) on Heroku:
1. Create separate repo for server code
2. Deploy to Heroku
3. Update client API URLs to point to Heroku app

## Pros:
- Both have generous free tiers
- Netlify excels at static sites
- Heroku great for APIs
- Separate scaling for frontend/backend

# Quick Testing with Ngrok

## For immediate testing without deployment:

### 1. Install ngrok:
```bash
# On macOS
brew install ngrok

# Or download from ngrok.com
```

### 2. Start your app locally:
```bash
npm start
```

### 3. Expose to internet:
```bash
# In another terminal
ngrok http 3000
```

### 4. Access your app:
- Use the https://xxx.ngrok.io URL provided
- Share this URL for testing

## Pros:
- Instant public access
- No deployment needed
- Great for demos and testing
- Free tier available
