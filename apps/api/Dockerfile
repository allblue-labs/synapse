# ---- Base: patched Alpine with OpenSSL for Prisma ----
# Prisma needs openssl + libssl + libc6-compat at runtime to detect TLS bindings.
# Without these, the schema engine fails with "Unexpected token 'E'" / "openssl-1.1.x" warnings.
FROM node:20-alpine AS base
RUN apk upgrade --no-cache && \
    apk add --no-cache openssl libssl3 libcrypto3 libc6-compat

# ---- Stage 1a: build the local contracts package ----
# Required so consumers get a CJS dist/ they can `require()` at runtime.
# Doing this in a dedicated stage avoids relying on npm's `prepare` lifecycle
# for `file:` dependencies, which is inconsistent across npm versions.
FROM base AS contracts-build
WORKDIR /app/packages/contracts
COPY packages/contracts/package.json packages/contracts/tsconfig.json ./
COPY packages/contracts/src/ ./src/
RUN npm install --silent --no-audit --no-fund && npm run build

# ---- Stage 1b: install API dependencies ----
FROM base AS deps
WORKDIR /app

# Use the *already-built* contracts package (with dist/) as the file: source.
COPY --from=contracts-build /app/packages/contracts/ packages/contracts/

COPY apps/api/package.json apps/api/package-lock.json* apps/api/

# `--install-links` forces npm to materialize file: deps as real copies inside
# node_modules instead of symlinking to packages/contracts. Without this, the
# runner stage (which only copies apps/api/node_modules) ends up with a
# dangling symlink and require('@synapse/contracts') fails at runtime.
WORKDIR /app/apps/api
RUN npm ci --install-links --prefer-offline 2>/dev/null || npm install --install-links

# ---- Stage 2: build the NestJS app ----
FROM base AS build
WORKDIR /app

COPY --from=contracts-build /app/packages/contracts/ packages/contracts/
COPY apps/api/ apps/api/
COPY --from=deps /app/apps/api/node_modules apps/api/node_modules

WORKDIR /app/apps/api
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build

# ---- Stage 3: production runner ----
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=build --chown=nestjs:nodejs /app/apps/api/dist apps/api/dist
COPY --from=build --chown=nestjs:nodejs /app/apps/api/node_modules apps/api/node_modules
COPY --from=build --chown=nestjs:nodejs /app/apps/api/prisma apps/api/prisma
COPY --chown=nestjs:nodejs apps/api/package.json apps/api/package.json
# Operational scripts (e.g. `npm run admin:create`) — executed via ts-node from
# the same node_modules. Kept out of the build pipeline so they ship as-is.
COPY --chown=nestjs:nodejs apps/api/scripts apps/api/scripts
COPY --chown=nestjs:nodejs apps/api/tsconfig.json apps/api/tsconfig.json

USER nestjs
EXPOSE 3000
WORKDIR /app/apps/api
CMD ["node", "dist/src/main.js"]
