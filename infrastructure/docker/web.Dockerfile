# ============================================================================
# ETAPA 1: COMPILACIÓN DEL FRONTEND (BUILDER)
# ============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

# Instalar y activar el soporte nativo de PNPM
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar el contexto completo para resolver las dependencias cruzadas del Workspace
COPY . .

# Instalar nodos con congelación de lockfile y compilar de forma aislada la Web
RUN pnpm install --frozen-lockfile
RUN pnpm --filter web build

# ============================================================================
# ETAPA 2: SERVIDOR DISTRIBUIDO ULTRA-LIGERO (RUNNER)
# ============================================================================
FROM nginx:alpine AS runner

# Copiar la configuración optimizada para Single Page Applications de Angular 19
COPY infrastructure/docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Transferir los artefactos estáticos generados en el build (limpiando capas de desarrollo)
COPY --from=builder /app/apps/web/dist/web/browser /usr/share/nginx/html

ENV PORT=80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
