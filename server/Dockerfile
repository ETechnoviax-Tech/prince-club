# ==============================================================================
# 69 Club API Server - Production Dockerfile (Render / Cloud / VPS)
# ==============================================================================
FROM node:22-alpine AS base

# Install curl for container health check
RUN apk add --no-cache curl

WORKDIR /app

# Install production dependencies first (optimized layer caching)
COPY package*.json ./
RUN npm ci --omit=dev --silent || npm install --omit=dev --silent

# Copy application source code
COPY . .

# Environment defaults
ENV NODE_ENV=production \
    PORT=5000

EXPOSE 5000

# Docker healthcheck against dynamic health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

CMD ["node", "index.js"]
