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

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g appuser -u 1001 && \
    adduser -D -G appuser -u 1001 appuser && \
    chown -R appuser:appuser /app

# Set environment to production
ENV NODE_ENV=production

# Copy built files from builder
COPY --from=builder --chown=appuser:appuser /app/dist ./dist
COPY --from=builder --chown=appuser:appuser /app/node_modules ./node_modules

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node /app/src/health.js || exit 1

# Start application
CMD ["node", "dist/server.js"]

# Security labels
LABEL maintainer="devops@socialai.com" \
      version="1.0.0" \
      description="Social AI for Curated Content - Production Backend"

# Use multi-stage for smaller production image
