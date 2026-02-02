# Multi-stage build for optimized production image
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY tsconfig.json ./
COPY .npmrc* ./
COPY src ./src
COPY public ./public
COPY index.html ./

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install nginx for production serving
RUN apk add --no-cache nginx

# Create non-root user for security
RUN addgroup -g appuser -u 1001 && \
    adduser -D -G appuser -u 1001 appuser

WORKDIR /usr/share/nginx/html

# Copy built files from builder
COPY --from=builder --chown=appuser:appuser /app/dist ./

# Configure nginx
RUN chown -R appuser:appuser /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Security labels
LABEL maintainer="devops@socialai.com" \
      version="1.0.0" \
      description="Social AI for Curated Content - Production Frontend"
