# ─────────────────────────────────────────────────────────────
# Zyvan Worker — Production Dockerfile
# Multi-stage build for the asynchronous delivery worker.
# ─────────────────────────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package*.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

# Install dependencies across workspaces
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build packages and Worker
RUN npm run build --workspace=packages/crypto
RUN npm run build --workspace=packages/database
RUN npm run build --workspace=packages/schemas
RUN npm run build --workspace=apps/worker

# ─── Production Image ─────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install dumb-init for graceful shutdown signals
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S zyvan -u 1001

# Copy artifacts
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/crypto/dist ./packages/crypto/dist
COPY --from=builder /app/packages/crypto/package.json ./packages/crypto/package.json
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/packages/schemas/dist ./packages/schemas/dist
COPY --from=builder /app/packages/schemas/package.json ./packages/schemas/package.json
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/package.json

USER zyvan

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/worker/dist/worker.js"]
