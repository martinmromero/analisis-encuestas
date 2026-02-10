# Multi-stage Dockerfile for analisis-encuestas

# 1) Base deps layer for caching
FROM node:20-alpine AS deps
WORKDIR /app
# Install dependencies for canvas (required for chartjs-node-canvas)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconf \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    fontconfig \
    ttf-dejavu \
    ttf-liberation
COPY package*.json ./
# Install all deps for dev layer (dev + prod)
RUN npm ci

# 2) Development image (hot reload with nodemon)
FROM node:20-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development
# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy source code
COPY . .
EXPOSE 3000
# Default path for dictionary in dev (can be overridden in compose)
ENV USER_DICT_FILE=/app/user-dictionary.json
CMD ["npm", "run", "dev"]

# 3) Production image (smaller, no dev deps)
FROM node:20-alpine AS prod

# Argumento de build para la versión (calculada externamente)
ARG APP_VERSION=1.033

WORKDIR /app
ENV NODE_ENV=production
ENV APP_VERSION=${APP_VERSION}

# Install runtime dependencies for canvas
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconf \
    cairo \
    cairo-dev \
    jpeg \
    jpeg-dev \
    pango \
    pango-dev \
    giflib \
    giflib-dev \
    pixman \
    pixman-dev \
    fontconfig \
    ttf-dejavu \
    ttf-liberation

# Only install prod deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Ensure uploads directory exists
RUN mkdir -p /app/uploads
# Dictionary path can be overridden; default remains in app root
ENV USER_DICT_FILE=/app/user-dictionary.json
EXPOSE 3000
CMD ["npm", "start"]
