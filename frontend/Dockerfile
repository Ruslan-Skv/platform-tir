# Build stage (Debian-based: Next.js 16 Turbopack/SWC requires glibc)
FROM node:20-slim AS builder

ENV HUSKY=0
ENV CI=true

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set audit false && \
    npm ci

# Build arguments for Next.js (baked in at build time)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# Публичный https://origin без завершающего / — для metadataBase (OG) и абсолютных URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ARG API_INTERNAL_URL
ENV API_INTERNAL_URL=${API_INTERNAL_URL}

COPY . .
RUN npm run build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Совпадает с docker-compose: SSR из Node ходит к бэкенду по имени сервиса. При необходимости переопределяется в compose.
ENV API_INTERNAL_URL=http://backend:3001

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
