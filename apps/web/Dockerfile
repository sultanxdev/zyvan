# ─────────────────────────────────────────────────────────────
# Zyvan Web — Production Dockerfile
# Next.js standalone container deployment.
# ─────────────────────────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package*.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Install dependencies
RUN npm ci

# Build packages and Next.js frontend
RUN npm run build --workspace=packages/crypto
RUN npm run build --workspace=packages/database
RUN npm run build --workspace=packages/schemas
RUN npm run build --workspace=apps/web

# ─── Production Image ─────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy public static assets and build output
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "start", "--workspace=apps/web"]
