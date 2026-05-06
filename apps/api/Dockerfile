# ---- Base: patched Alpine with OpenSSL for Prisma ----
# Prisma needs openssl + libssl + libc6-compat at runtime to detect TLS bindings.
# Without these, the schema engine fails with "Unexpected token 'E'" / "openssl-1.1.x" warnings.
FROM node:20-alpine AS base
RUN apk upgrade --no-cache && \
    apk add --no-cache openssl libssl3 libcrypto3 libc6-compat

# ---- Stage 1: install dependencies ----
FROM base AS deps
WORKDIR /app

# Copy local contracts package (file: dependency)
COPY packages/contracts/ packages/contracts/

# Copy API manifest and lock file
COPY apps/api/package.json apps/api/package-lock.json* apps/api/

# Install from apps/api (resolves file:../../packages/contracts)
WORKDIR /app/apps/api
RUN npm ci --prefer-offline 2>/dev/null || npm install

# ---- Stage 2: build ----
FROM base AS build
WORKDIR /app

COPY packages/ packages/
COPY apps/api/ apps/api/
COPY --from=deps /app/apps/api/node_modules apps/api/node_modules

WORKDIR /app/apps/api
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build

# ---- Stage 3: production runner ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=build --chown=nestjs:nodejs /app/apps/api/dist apps/api/dist
COPY --from=build --chown=nestjs:nodejs /app/apps/api/node_modules apps/api/node_modules
COPY --from=build --chown=nestjs:nodejs /app/apps/api/prisma apps/api/prisma
COPY --chown=nestjs:nodejs apps/api/package.json apps/api/package.json

USER nestjs
EXPOSE 3000
WORKDIR /app/apps/api
CMD ["node", "dist/src/main.js"]
