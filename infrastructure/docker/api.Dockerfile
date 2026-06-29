# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=11.5.2

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl \
  && corepack enable \
  && corepack prepare pnpm@${PNPM_VERSION} --activate

FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --frozen-lockfile --filter api...

FROM deps AS build
COPY apps/api ./apps/api
ENV DATABASE_URL="postgresql://whatboo:whatboo@localhost:5432/whatboo?schema=public"
RUN pnpm --filter api prisma:generate
RUN rm -f apps/api/tsconfig.tsbuildinfo && pnpm --filter api build

FROM deps AS prod-deps
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/prisma.config.ts ./apps/api/prisma.config.ts
ENV DATABASE_URL="postgresql://whatboo:whatboo@localhost:5432/whatboo?schema=public"
RUN pnpm --filter api prisma:generate
RUN mkdir -p /tmp/prisma-generated \
  && cp -a node_modules/.pnpm/@prisma+client@*/node_modules/.prisma /tmp/prisma-generated/.prisma \
  && rm -rf node_modules apps/api/node_modules \
  && CI=true pnpm install --prod --offline --frozen-lockfile --filter api... \
  && cp -a /tmp/prisma-generated/.prisma node_modules/.pnpm/@prisma+client@*/node_modules/

FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV WHATSAPP_WORKER_ENABLED=true
WORKDIR /app
RUN apk add --no-cache dumb-init libc6-compat openssl \
  && addgroup --system --gid 1001 nestjs \
  && adduser --system --uid 1001 nestjs

COPY --from=prod-deps --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nestjs:nestjs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps --chown=nestjs:nestjs /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=nestjs:nestjs /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=nestjs:nestjs /app/apps/api/prisma ./apps/api/prisma

USER nestjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/v1/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["dumb-init", "node", "apps/api/dist/main.js"]
