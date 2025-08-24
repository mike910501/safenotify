# SafeNotify Backend - Production Docker Image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S safenotify -u 1001

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    curl \
    tzdata

# Set timezone to Colombia
ENV TZ=America/Bogota
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Create required directories with proper permissions
RUN mkdir -p data logs uploads && \
    chown -R safenotify:nodejs data logs uploads

# Copy application code
COPY --chown=safenotify:nodejs . .

# Set proper permissions
RUN chmod +x scripts/setup.js

# Switch to non-root user
USER safenotify

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Set production environment
ENV NODE_ENV=production

# Start command
CMD ["npm", "start"]

# Labels for better maintainability
LABEL maintainer="SafeNotify Team"
LABEL description="SafeNotify Backend API - Secure WhatsApp Business Integration"
LABEL version="1.0.0"
LABEL build-date="2024-08-23"