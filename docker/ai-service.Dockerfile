# Multi-stage build for optimized production image
FROM python:3.11-alpine AS builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY embeddings.py .
COPY entities.py .
COPY main.py .

# Production stage
FROM python:3.11-alpine AS production

# Create non-root user for security
RUN addgroup -g appuser -u 1001 && \
    adduser -D -G appuser -u 1001 appuser

WORKDIR /app

# Copy files from builder
COPY --from=builder --chown=appuser:appuser /app .

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=5).read() == 'OK' or exit(1)"

# Start application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# Security labels
LABEL maintainer="devops@socialai.com" \
      version="1.0.0" \
      description="Social AI for Curated Content - AI Service"
