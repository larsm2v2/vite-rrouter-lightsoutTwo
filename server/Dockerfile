# Use official Node.js LTS as base
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies first (use package.json + package-lock.json for caching)
COPY package*.json ./
RUN npm ci  --no-cache

# Copy the rest of your source code
COPY . .

# Build the server (transpile TypeScript)
RUN npm run build

# ----

# Production image
FROM node:20-alpine

WORKDIR /app

# Non-root user
RUN chown -R node:node /app
USER node
ENV NODE_ENV=production
# Copy only necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Install only production dependencies

RUN npm ci --no-cache --omit=dev


# Environment variables will come from docker-compose or .env
# Healthcheck (adjust endpoint if needed)\

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8000/health || exit 1


# Start the server
CMD ["node", "dist/app.js"]
