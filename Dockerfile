# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Base Stage: Official Node.js LTS (Alpine Linux)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS base

# Install libc6-compat and openssl required for Prisma and Sharp native binaries
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# -----------------------------------------------------------------------------
# Dependencies Stage: Install all dependencies (dev + prod) for build
# -----------------------------------------------------------------------------
FROM base AS deps

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies strictly matching package-lock
RUN npm ci

# -----------------------------------------------------------------------------
# Builder Stage: Generate Prisma Client and build Next.js application
# -----------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate custom Prisma Client into lib/generated/prisma
RUN npx prisma generate

# Build Next.js application (permanently bakes .next bundle into the image)
RUN npm run build

# -----------------------------------------------------------------------------
# Runner Stage: Minimal production image for GCP Container / Cloud Run
# -----------------------------------------------------------------------------
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# GCP Cloud Run default port is 8080 (also dynamically overridable by $PORT)
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Create a non-root group and user for container security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy runtime assets and built bundles
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/Themes ./Themes
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib/generated ./lib/generated

# Copy Next.js build cache and output with proper user permissions
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# Switch to unprivileged user
USER nextjs

# Expose GCP Cloud Run / container port
EXPOSE 8080

# Start Next.js in production mode
CMD ["npm", "run", "start"]
