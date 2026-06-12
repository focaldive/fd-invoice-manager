# syntax=docker/dockerfile:1

# ---- Base ---------------------------------------------------------------
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- Dependencies (full, incl. dev — needed for build + migrations) -----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Builder (produces .next/standalone) --------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# All routes are force-dynamic, so no database connection is needed at build time.
RUN npm run build

# ---- Migrator (one-shot: applies Drizzle migrations) --------------------
FROM base AS migrator
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/server/db/schema ./src/server/db/schema
CMD ["npm", "run", "db:migrate"]

# ---- Runner (slim production image) -------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone server + the assets it does not bundle itself.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
