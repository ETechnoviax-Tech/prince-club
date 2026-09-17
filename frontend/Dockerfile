# ==============================================================================
# 69 Club Frontend - Production Dockerfile (Docker / Containerized Deployment)
# Note: For Cloudflare Pages, deployment is git-integrated (npm run build -> dist)
# ==============================================================================

# Stage 1: Build static assets with Node
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --silent || npm install --silent

# Copy source code
COPY . .

# Build arguments for dynamic environment injection at build time
ARG VITE_APP_DOMAIN=69club1.site
ARG VITE_API_DOMAIN=api.69club1.site
ARG VITE_API_BASE_URL=
ARG VITE_API_URL=
ARG VITE_SUPABASE_URL=
ARG VITE_SUPABASE_ANON_KEY=

ENV VITE_APP_DOMAIN=$VITE_APP_DOMAIN \
    VITE_API_DOMAIN=$VITE_API_DOMAIN \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_URL=$VITE_API_URL \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build production bundle
RUN npm run build

# Stage 2: Serve optimized static assets with Nginx
FROM nginx:alpine AS runner

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
