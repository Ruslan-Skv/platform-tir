# Build stage: Bullseye нужен для libssl1.1 (Prisma query engine), Alpine/musl не подходят для Prisma
FROM node:20-bullseye-slim AS builder

# Husky/git hooks не нужны в образе; CI=true — стандартный маркер для install-скриптов
ENV HUSKY=0
ENV CI=true

RUN apt-get update -y && apt-get install -y --no-install-recommends \
    openssl ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (retry config for flaky networks)
# scripts/ ещё не скопирован — postinstall удаляем; prisma generate ниже после COPY prisma/
COPY package.json package-lock.json ./
RUN npm pkg delete scripts.postinstall && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set audit false && \
    npm ci

# Copy prisma and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Build application
COPY . .
RUN npm run build

# Production stage
# OpenSSL нужен Prisma Schema Engine (migrate deploy). apt-get работает в CI и локально; на VPS — образы из GHCR.
FROM node:20-slim AS runner

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*

# НУЦ Минцифры — TLS для platform-api2.max.ru (без них fetch в контейнере падает по SSL)
COPY certs/russian_trusted_root_ca.pem certs/russian_trusted_sub_ca.pem /app/certs/
RUN mkdir -p /usr/local/share/ca-certificates \
    && (wget -q -O /usr/local/share/ca-certificates/russian_trusted_root_ca.crt \
          https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt \
        || tr -d '\r' < /app/certs/russian_trusted_root_ca.pem \
          > /usr/local/share/ca-certificates/russian_trusted_root_ca.crt) \
    && (wget -q -O /usr/local/share/ca-certificates/russian_trusted_sub_ca.crt \
          https://gu-st.ru/content/lending/russian_trusted_sub_ca_pem.crt \
        || tr -d '\r' < /app/certs/russian_trusted_sub_ca.pem \
          > /usr/local/share/ca-certificates/russian_trusted_sub_ca.crt) \
    && update-ca-certificates

WORKDIR /app

ENV NODE_ENV=production
ENV HUSKY=0
ENV CI=true

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Install production dependencies only (retry config for flaky networks)
COPY package.json package-lock.json ./
# prepare/husky и postinstall — только для локальной разработки; prisma generate ниже
RUN npm pkg delete scripts.prepare scripts.postinstall && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set audit false && \
    npm ci --omit=dev && npm cache clean --force

# Copy prisma schema, migrations and create-super-admin script
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY prisma/migrations ./prisma/migrations
COPY prisma/data ./prisma/data
COPY prisma/create-super-admin.cjs ./prisma/create-super-admin.cjs
COPY prisma/seed-product-card-badges.cjs ./prisma/seed-product-card-badges.cjs
COPY prisma/seed-quiz-remont.cjs ./prisma/seed-quiz-remont.cjs
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
