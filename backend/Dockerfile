# Build stage (Debian: Prisma has compatibility issues with Alpine/musl)
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies (retry config for flaky networks)
COPY package.json package-lock.json* ./
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci

# Copy prisma and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Build application
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim AS runner

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Install production dependencies only (retry config for flaky networks)
COPY package.json package-lock.json* ./
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci --omit=dev && npm cache clean --force

# Copy prisma schema and migrations (explicit migrations copy for Docker context)
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY prisma/migrations ./prisma/migrations
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Create uploads directory (backend stores files here)
RUN mkdir -p uploads

# Give nestjs ownership of /app (required for prisma migrate deploy to write engines)
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3001

# Run migrations then start the app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
