# ─────────────────────────────────────────────────────────────
# Base image
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

RUN apk upgrade --no-cache && \
    apk add --no-cache \
    openssl \
    libssl3 \
    libcrypto3 \
    libc6-compat

# ─────────────────────────────────────────────────────────────
# Contracts build stage
# ─────────────────────────────────────────────────────────────
FROM base AS contracts-build

WORKDIR /app/packages/contracts

COPY packages/contracts/package.json ./
COPY packages/contracts/package-lock.json* ./
COPY packages/contracts/tsconfig.json ./
COPY packages/contracts/src ./src

RUN npm ci

RUN npm run build

# ─────────────────────────────────────────────────────────────
# API dependencies
# ─────────────────────────────────────────────────────────────
FROM base AS deps

WORKDIR /app/apps/api

COPY apps/api/package.json ./
COPY apps/api/package-lock.json* ./

RUN npm ci

# ─────────────────────────────────────────────────────────────
# Build stage
# ─────────────────────────────────────────────────────────────
FROM base AS build

WORKDIR /app

# API source
COPY apps/api /app/apps/api

# Dependencies
COPY --from=deps /app/apps/api/node_modules /app/apps/api/node_modules

# Remove broken symlink/file if exists
RUN rm -rf /app/apps/api/node_modules/@synapse/contracts && \
    mkdir -p /app/apps/api/node_modules/@synapse/contracts

# Inject contracts package manually
COPY --from=contracts-build \
    /app/packages/contracts/dist \
    /app/apps/api/node_modules/@synapse/contracts/dist

COPY --from=contracts-build \
    /app/packages/contracts/package.json \
    /app/apps/api/node_modules/@synapse/contracts/package.json

WORKDIR /app/apps/api

# Prisma
RUN npx prisma generate --schema=prisma/schema.prisma

# Nest build
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Production runner
# ─────────────────────────────────────────────────────────────
FROM base AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Application dist
COPY --from=build --chown=nestjs:nodejs \
    /app/apps/api/dist \
    /app/apps/api/dist

# Dependencies
COPY --from=build --chown=nestjs:nodejs \
    /app/apps/api/node_modules \
    /app/apps/api/node_modules

# Prisma schema
COPY --from=build --chown=nestjs:nodejs \
    /app/apps/api/prisma \
    /app/apps/api/prisma

# Runtime files
COPY --chown=nestjs:nodejs \
    apps/api/package.json \
    /app/apps/api/package.json

COPY --chown=nestjs:nodejs \
    apps/api/tsconfig.json \
    /app/apps/api/tsconfig.json

COPY --chown=nestjs:nodejs \
    apps/api/scripts \
    /app/apps/api/scripts

USER nestjs

EXPOSE 3000

WORKDIR /app/apps/api

CMD ["node", "dist/src/main.js"]