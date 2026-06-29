# Estado estable del proyecto WhatBoo

Fecha de corte: 2026-06-29

Este documento resume lo que ya esta implementado, alineado y verificado en el proyecto hasta ahora. Su objetivo es servir como punto de referencia antes de continuar con nuevas fases de producto, infraestructura o despliegue.

## 1. Stack y estructura general

- Monorepo con `pnpm`.
- Backend en NestJS, mantenido en `apps/api`.
- Frontend en Angular 19 standalone, mantenido en `apps/web`.
- Base de datos PostgreSQL con Prisma.
- Redis para cache, locks distribuidos, rate limiting y colas.
- BullMQ para procesamiento asincrono de WhatsApp.
- Tailwind CSS mantenido en frontend.
- Dockerfiles separados para API, Web y Worker.

## 2. Frontend Angular 19

Estado: estable y compilando.

Implementado:

- Angular 19 standalone.
- Interceptor HTTP global para adjuntar tenant a las peticiones.
- Integracion con backend mediante `environment.apiUrl`.
- Rutas de dashboard para reservas, clientes, usuarios, mesas, settings, reportes e integraciones.
- Consumo actualizado de endpoints canonicos:
  - `/customers`
  - `/users`
  - `/reservations`
  - `/restaurants/settings`
  - `/restaurants/tables`
  - `/restaurants/zones`
- Cancelacion de reservas alineada con endpoint dedicado `PATCH /reservations/:id/cancel`.
- Staff management alineado con `UsersController` mediante `/users`.
- Clientes alineados con `CustomersController` mediante `/customers`.
- Busqueda real de clientes desde frontend contra backend.

Verificacion:

- `pnpm --filter web build` OK.

## 3. Design System frontend

Estado: implementado como base enterprise.

Implementado:

- Design tokens en `apps/web/src/styles`.
- Estructura CSS modular.
- Utilities compartidas.
- Component styles reducidos y mas consistentes.
- Tailwind 4 integrado mediante `styles.css`.
- `postcss.config.js` agregado para Angular/Tailwind.
- Reduccion de CSS duplicado en multiples features.
- Mejor alineacion visual para dashboard operativo.

Documento relacionado:

- `docs/frontend-audit.md`

## 4. Multi-tenant dinamico

Estado: implementado y alineado backend/frontend.

Implementado:

- Middleware perimetral NestJS para resolver tenant dinamicamente.
- Soporte de tenant por subdominio y headers.
- Headers soportados:
  - `X-Tenant-Slug`
  - `X-Tenant-ID`
- Interceptor Angular que adjunta tenant de forma transparente.
- Validacion en `JwtAuthGuard` para evitar inconsistencias entre token y tenant activo.
- CORS actualizado para aceptar headers tenant-aware.
- Indices parciales/relacionales sobre `restaurantId` agregados mediante migracion.

Archivos relevantes:

- `apps/api/src/common/middleware/tenant.middleware.ts`
- `apps/web/src/app/core/interceptors/tenant.interceptor.ts`
- `apps/api/src/modules/platform/auth/guards/jwt-auth.guard.ts`

## 5. Backend NestJS

Estado: estable y compilando.

Implementado:

- Arquitectura modular NestJS.
- Modulos principales:
  - Auth
  - Restaurants
  - Customers
  - Reservations
  - Users
  - WhatsApp
  - Availability
  - Health
  - AI/intent parsing
- Validacion global mediante `ValidationPipe`.
- Prefijo global `/api/v1`.
- Healthcheck en `/api/v1/health`.
- Redis module y Prisma module operativos.

Verificacion:

- `pnpm --filter api build` OK.
- Arranque Nest verificado con registro correcto de rutas principales.

Nota conocida:

- El arranque local muestra aviso SMTP `ECONNREFUSED ::1:1025` cuando no hay servidor SMTP local. No bloquea la API y no pertenece a las fases cerradas.

## 6. Dashboard API

Estado: cerrado para la fase actual.

### Restaurants

Implementado para dashboard tenant:

- `GET /restaurants/settings`
- `PATCH /restaurants/settings`
- `GET /restaurants/zones`
- `POST /restaurants/zones`
- `PATCH /restaurants/zones/:zoneId`
- `DELETE /restaurants/zones/:zoneId`
- `GET /restaurants/tables`
- `POST /restaurants/tables`
- `PATCH /restaurants/tables/:tableId`
- `DELETE /restaurants/tables/:tableId`
- `GET /restaurants/analytics`
- Endpoints legacy compatibles por slug para analytics, customers, staff y meta credentials.

Decision estable:

- No se implemento CRUD platform/admin completo de restaurantes porque el dashboard actual gestiona el tenant activo mediante settings. El CRUD global de restaurantes queda reservado para un futuro panel platform/admin.

### Customers

Implementado:

- `GET /customers`
- `GET /customers?q=&take=&skip=`
- `GET /customers/:id`
- Busqueda por nombre, apellido, email y telefono.
- Aislamiento por tenant.
- Respuesta paginable `{ data, total }`.

Frontend:

- Pantalla de clientes consume `/customers`.
- Busqueda conectada al backend.
- Se eliminaron mocks como fallback visual para evitar ocultar inconsistencias.

### Reservations

Implementado:

- `GET /reservations/today`
- `GET /reservations?date=YYYY-MM-DD`
- `GET /reservations/:id`
- `POST /reservations`
- `PATCH /reservations/:id`
- `PATCH /reservations/:id/status`
- `PATCH /reservations/:id/cancel`

Cancelacion:

- Endpoint dedicado para cancelacion desde dashboard.
- Soporte de motivo opcional.
- Emision de evento realtime `reservation_updated`.

### Users / Staff

Implementado:

- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PATCH /users/:id`
- Gestion de staff por restaurante.
- Creacion de usuarios con password temporal.
- Cambio de rol.
- Activacion/suspension.
- Proteccion de `OWNER`.
- No se expone `passwordHash`.

Frontend:

- Pantalla de usuarios consume `/users`.
- Las rutas legacy `/restaurants/staff` siguen existiendo para compatibilidad, pero el contrato canonico ahora es `/users`.

## 7. Core MVP Flow de reservas

Estado: implementado y refactorizado hacia arquitectura mas limpia.

Flujo estable:

1. Mensaje WhatsApp recibido.
2. Webhook valida estructura y firma.
3. Payload entra a cola BullMQ.
4. Worker procesa mensaje.
5. Servicio deterministico interpreta intencion y entidades.
6. Se valida disponibilidad.
7. Se crea reserva dentro de caso de uso transaccional.
8. Se envia confirmacion por WhatsApp.

Implementado:

- `CreateReservationUseCase` explicito.
- `AvailabilityService` explicito.
- `DeterministicReservationIntentService` para el flujo MVP de WhatsApp.
- `ReservationEngineService.createReservation()` mantiene compatibilidad y delega al use case.
- Repositorios criticos aceptan `Prisma.TransactionClient` opcional.
- Creacion de reserva usa:
  - Redis lock.
  - Bloqueo SQL `FOR UPDATE` sobre restaurante.
  - Check de disponibilidad dentro de la transaccion.
  - Upsert de customer dentro de la transaccion.
  - Creacion de reserva dentro de la transaccion.

## 8. WhatsApp webhook, cola y resiliencia

Estado: implementado.

Implementado:

- `GET /whatsapp/webhook` para verificacion Meta.
- `POST /whatsapp/webhook` para mensajes entrantes.
- Validacion estructural estricta con Zod.
- Validacion de firma `x-hub-signature-256`.
- Validacion de telefono.
- Rate limiting con `@nestjs/throttler`.
- Storage de throttling respaldado por Redis.
- Cola BullMQ para mensajes inbound.
- Worker asincrono de WhatsApp.
- DLQ para mensajes fallidos.
- Soporte de `WHATSAPP_WORKER_ENABLED` para separar API HTTP y Worker.

## 9. Base de datos y datos de prueba

Estado: implementado para pruebas reales locales.

Implementado:

- Seed de restaurante demo `la-bella-italia`.
- Usuarios demo:
  - `owner@labellaitalia.test`
  - `manager@labellaitalia.test`
  - `staff@labellaitalia.test`
- Password demo:
  - `WhatBooDemo2026!`
- Datos iniciales:
  - restaurante
  - zonas
  - mesas
  - horarios
  - reglas de capacidad
  - WhatsApp account
  - clientes
  - reservas
- Migracion para zonas de restaurante.
- Migracion para indices tenant-aware sobre `restaurantId`.

## 10. DevOps y contenerizacion

Estado: implementado y validado localmente.

Implementado:

- `.dockerignore` para reducir contexto Docker.
- `infrastructure/docker/api.Dockerfile`
  - multi-stage
  - Prisma generate
  - build TypeScript
  - runtime `node:22-alpine`
  - usuario no-root
  - healthcheck
- `infrastructure/docker/web.Dockerfile`
  - build Angular
  - runtime Alpine + Nginx
  - Brotli/Gzip
  - SPA fallback
  - proxy `/api`
  - healthcheck
- `infrastructure/docker/worker.Dockerfile`
  - worker basado en imagen API
  - `node apps/api/dist/worker.js`
- `infrastructure/compose/docker-compose.prod.yml`
  - Postgres
  - Redis
  - API
  - Worker
  - Web
  - variables por entorno, sin secretos hardcodeados.

Verificacion:

- Build Docker API OK.
- Build Docker Web OK.
- Build Docker Worker OK.
- Prisma client importable dentro de imagen API.
- Web container responde `/healthz`.

Nota:

- Imagen Web final verificada alrededor de 25.8 MB.
- Imagen API funcional verificada alrededor de 760 MB. Reducirla significativamente requiere una fase especifica de optimizacion de dependencias runtime/Prisma.

## 11. CI/CD y despliegue cloud

Estado: existe base, no cerrado como produccion final.

Existe:

- `.github/workflows/deploy.yml`
- Build y push de imagenes a Artifact Registry con tag basado en SHA.
- Despliegue inicial a Cloud Run.

Pendiente:

- Definir proveedor final: GCP o Azure.
- Reemplazar credenciales JSON por OIDC / Workload Identity Federation.
- Desplegar Worker como servicio separado.
- Conectar Cloud SQL y Redis administrado de forma privada.
- Smoke tests post-deploy.
- Configuracion final de secretos gestionados.

## 12. Verificaciones recientes

Comandos verificados durante las fases cerradas:

```bash
pnpm --filter api build
pnpm --filter web build
```

Resultado:

- API build OK.
- Web build OK.
- Nest arranca y registra rutas nuevas de dashboard:
  - `/api/v1/customers`
  - `/api/v1/customers/:id`
  - `/api/v1/reservations/:id/cancel`
  - `/api/v1/users`
  - `/api/v1/users/:id`

## 13. Tareas futuras a revisar

### Alta prioridad

- Crear tests e2e para Dashboard API:
  - customers list/search/view
  - reservations cancel/status/update
  - users create/update/activate/deactivate
  - tenant isolation
- Corregir specs antiguas del frontend que siguen esperando APIs viejas.
- Revisar SMTP local y configurar Mailpit/Mailhog o proveedor SMTP real por entorno.
- Formalizar DTOs backend para `CustomersController` y `UsersController` en lugar de `any`.
- Agregar paginacion y filtros avanzados a reservas.
- Agregar endpoint de auditoria de cancelacion con motivo estructurado, no solo notas.

### Media prioridad

- Crear `StaffService` o `UsersService` para mover logica fuera del controller.
- Crear `CustomersService` para separar busqueda, perfil y metricas CRM.
- Normalizar respuestas paginadas en todos los endpoints de dashboard.
- Agregar Swagger/OpenAPI actualizado con las rutas nuevas.
- Agregar guards por rol mas declarativos mediante decorators.
- Revisar legacy endpoints en `RestaurantsController` y planear deprecacion ordenada.
- Agregar optimistic UI y estados de error mas finos en clientes/usuarios/reservas.

### DevOps / Cloud

- Elegir proveedor final: GCP Cloud Run o Azure Container Apps.
- Migrar GitHub Actions a OIDC.
- Agregar despliegue separado de Worker.
- Configurar Cloud SQL/PostgreSQL administrado y Redis privado.
- Agregar smoke tests post-deploy.
- Versionar imagenes por SHA y promover por ambientes.
- Definir entornos `dev`, `staging` y `prod`.

### Performance

- Reducir tamano de imagen API.
- Revisar dependencias pesadas de Prisma runtime.
- Medir queries criticas con `EXPLAIN ANALYZE`.
- Agregar cache selectivo para settings y availability cuando sea seguro.
- Agregar indices adicionales segun queries reales de dashboard.

### Seguridad

- Rotacion de secretos.
- Politicas de password y expiracion de password temporal.
- Auditoria de acciones administrativas.
- Rate limiting diferenciado para dashboard y webhook.
- Reforzar CSP/headers finales en Nginx.

### Producto

- Panel platform/admin para CRUD global de restaurantes, si el SaaS necesitara operar multiples restaurantes desde una consola central.
- Invitaciones de staff por email.
- Perfil detallado de cliente con historial de reservas.
- Motivos estructurados de cancelacion/no-show.
- Reportes operativos por rango de fechas.
