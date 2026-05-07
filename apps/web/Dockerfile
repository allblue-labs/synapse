# ---- Base: patched Alpine ----
FROM node:20-alpine AS base
RUN apk upgrade --no-cache && apk add --no-cache libc6-compat

# ---- Stage 1a: build the local contracts package ----
# Same approach as the API Dockerfile: produce dist/ explicitly rather than
# relying on npm's `prepare` lifecycle for file: deps.
FROM base AS contracts-build
WORKDIR /app/packages/contracts
COPY packages/contracts/package.json packages/contracts/tsconfig.json ./
COPY packages/contracts/src/ ./src/
RUN npm install --silent --no-audit --no-fund && npm run build

# ---- Stage 1b: install Web dependencies ----
FROM base AS deps
WORKDIR /app

COPY --from=contracts-build /app/packages/contracts/ packages/contracts/

COPY apps/web/package.json apps/web/package-lock.json* apps/web/

# `--install-links` materializes file: deps as real copies (see API Dockerfile note).
WORKDIR /app/apps/web
RUN npm ci --install-links --prefer-offline 2>/dev/null || npm install --install-links

# ---- Stage 2: Next.js build ----
FROM base AS build
WORKDIR /app

COPY --from=contracts-build /app/packages/contracts/ packages/contracts/
COPY apps/web/ apps/web/
COPY --from=deps /app/apps/web/node_modules apps/web/node_modules

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/v1
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/web
RUN npm run build

# ---- Stage 3: production runner ----
FROM base AS runner
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next apps/web/.next
COPY --from=build --chown=nextjs:nodejs /app/apps/web/node_modules apps/web/node_modules
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public apps/web/public
COPY --chown=nextjs:nodejs apps/web/package.json apps/web/package.json
COPY --chown=nextjs:nodejs apps/web/next.config.ts apps/web/next.config.ts

USER nextjs
EXPOSE 3000
ENV PORT=3000
WORKDIR /app/apps/web
CMD ["npm", "run", "start"]
