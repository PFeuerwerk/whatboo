# ============================================================================
# ETAPA 1: AISLAMIENTO DEL CONTENIDO (PRUNER)
# ============================================================================
FROM node:22-alpine AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
# Aísla atómicamente la API NestJS y sus dependencias internas compartidas
RUN turbo prune --scope=api --docker

# ============================================================================
# ETAPA 2: COMPILACIÓN DEL BACKEND (BUILDER)
# ============================================================================
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Instalar PNPM de forma global y configurar almacenamiento en caché nativo
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar únicamente los archivos mínimos podados del monorrepositorio
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Instalar todas las dependencias requeridas para la compilación de TypeScript
RUN pnpm install --frozen-lockfile

# Copiar el código fuente atómico e inyectar el motor relacional de Prisma
COPY --from=pruner /app/out/full/ .
RUN pnpm --filter api prisma generate

# Compilar TypeScript a binarios puros de JavaScript optimizados
RUN pnpm --filter api build

# Eliminar dependencias de desarrollo e instalar estrictamente las de producción
RUN rm -rf node_modules && pnpm install --prod --frozen-lockfile

# ============================================================================
# ETAPA 3: ENTORNO MINIMALISTA DE PRODUCCIÓN (RUNNER)
# ============================================================================
FROM node:22-alpine AS runner
WORKDIR /app

# Configuración de seguridad: Evitar ejecutar el contenedor como root
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs
USER nestjs

# Copiar metadatos y contratos del espacio de trabajo
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copiar dependencias de producción y código fuente transaccional compilado
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Inyección dinámica de variables de entorno elásticas
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Punto de entrada de alta velocidad para Cloud Run
CMD ["node", "apps/api/dist/main.js"]
