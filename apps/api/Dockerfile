# ─────────────────────────────────────────────────────────────
# Zyvan API — Production Dockerfile
# Multi-stage build for minimal image size and fast startup.
# ─────────────────────────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package*.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install dependencies across workspaces
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build packages and API
RUN npm run build --workspace=packages/crypto
RUN npm run build --workspace=packages/database
RUN npm run build --workspace=packages/schemas
RUN npm run build --workspace=apps/api

# ─── Production Image ─────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Install dumb-init for proper PID 1 signal forwarding
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S zyvan -u 1001

# Copy package descriptors and built artifacts
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/crypto/dist ./packages/crypto/dist
COPY --from=builder /app/packages/crypto/package.json ./packages/crypto/package.json
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/packages/schemas/dist ./packages/schemas/dist
COPY --from=builder /app/packages/schemas/package.json ./packages/schemas/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

USER zyvan

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/api/dist/app.js"]
