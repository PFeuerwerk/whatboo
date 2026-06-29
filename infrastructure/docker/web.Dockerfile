# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=11.5.2

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --filter web...

FROM deps AS build
COPY apps/web ./apps/web
RUN pnpm --filter web build --configuration production

FROM alpine:3.20 AS runtime
RUN apk add --no-cache gettext nginx nginx-mod-http-brotli \
  && mkdir -p /run/nginx /usr/share/nginx/html /etc/nginx/templates /etc/nginx/conf.d
COPY infrastructure/docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY infrastructure/docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist/web/browser /usr/share/nginx/html

ENV NGINX_PORT=80
ENV API_UPSTREAM=http://api:3000
ENV NGINX_RESOLVER=127.0.0.11
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${NGINX_PORT}/healthz" || exit 1

CMD ["/bin/sh", "-c", "envsubst '${NGINX_PORT} ${API_UPSTREAM} ${NGINX_RESOLVER}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
