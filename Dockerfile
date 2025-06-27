# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (caching)
COPY package*.json ./
RUN npm install

# Copy client package files
COPY client/package*.json ./client/
RUN cd client && npm install

# Copy rest of the application
COPY . .

# Build client
RUN cd client && npm run build

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
