# ============================================================================
# GROUNDTRUTH - Multi-stage Dockerfile for SPCS Deployment
# ============================================================================
# Stage 1: Build React frontend
# Stage 2: Python runtime with nginx for serving

# ------------------------------------------------------------------------------
# Stage 1: Build React Frontend
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --silent

# Copy frontend source
COPY frontend/ ./

# Build production bundle
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Python Runtime with Nginx
# ------------------------------------------------------------------------------
FROM python:3.11-slim

# Install nginx and other dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    curl \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python requirements and install
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY deploy/nginx.conf /etc/nginx/nginx.conf

# Copy supervisor configuration (if using)
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create startup script
RUN echo '#!/bin/bash\n\
echo "Starting GROUNDTRUTH..."\n\
echo "Environment: SPCS=${SNOWFLAKE_HOST:-local}"\n\
\n\
# Start nginx\n\
nginx\n\
\n\
# Start FastAPI with uvicorn\n\
exec python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --log-level info\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose port (nginx listens on 8080, proxies to FastAPI on 8000)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start services
CMD ["/bin/bash", "/app/start.sh"]
