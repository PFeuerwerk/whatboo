# Estado del proyecto WhatBoo

Fecha de corte: 2026-06-30

Este documento resume el estado real del monorepo tras una revision tecnica del codigo, la documentacion, los scripts disponibles y las verificaciones locales. Sustituye el corte anterior del 2026-06-29 y corrige puntos que ya habian cambiado en el codigo.

## 1. Resumen ejecutivo

Estado general: MVP avanzado, compilable y con una base backend solida para dashboard tenant, autenticacion, reservas, clientes, usuarios, email, WhatsApp y administracion de plataforma.

Verificado en esta revision:

- `pnpm --filter api build` OK.
- `pnpm --filter web build` OK.
- `pnpm --filter api test:e2e` OK, con 12 escenarios dashboard/plataforma/operacion pasando.
- `pnpm --filter web test:ci` OK con Google Chrome Linux en WSL.

Conclusiones principales:

- El backend esta mas avanzado que el documento anterior: ya existen `CustomersService`, `UsersService`, DTOs para users/customers/reservations, auditoria de cancelacion y endpoint de no-show.
- El frontend compila y ya expone el modulo de clientes desde `/customers` en la navegacion principal.
- `docs/api/openapi.yml` esta saneado como contrato OpenAPI valido y se valida con tooling local.
- Existe CI para install, OpenAPI validate, Prisma generate, API build, Web build, Web unit tests, API e2e, empaquetado de artefactos y construccion/exportacion de imagenes Docker API/Web/Worker.

## 2. Stack y estructura

- Monorepo `pnpm` con `turbo`.
- Backend NestJS en `apps/api`.
- Frontend Angular 19 standalone en `apps/web`.
- PostgreSQL con Prisma 7.
- Redis para cache, throttling y BullMQ.
- BullMQ para jobs de WhatsApp y email.
- Dockerfiles separados para API, Web y Worker.
- Compose productivo en `infrastructure/compose/docker-compose.prod.yml`.

## 3. Backend API

Estado: estable y compilando.

Implementado:

- Prefijo global `/api/v1`.
- Validacion global con `ValidationPipe`.
- Modulos principales:
  - Auth
  - Platform Admin
  - Restaurants
  - Customers
  - Users
  - Reservations
  - Availability
  - WhatsApp
  - AI/intent parsing
  - Email
  - Health
  - OpenAPI serving module
- Throttling global con soporte Redis fuera de `NODE_ENV=test`.
- Middleware tenant-aware aplicado a todas las rutas.
- WebSocket gateway para eventos dashboard por restaurante.
- Healthcheck agregado de colas `GET /health/queues` para email y WhatsApp.
- Liveness/readiness separados: `GET /health/live` y `GET /health/ready`.

Verificacion:

- Build TypeScript OK.
- E2E dashboard/plataforma OK.

## 4. Autenticacion y seguridad

Estado: implementado con varias piezas enterprise ya presentes.

Implementado:

- Login por email, password y `restaurantSlug`.
- JWT con `restaurantId`, email, role y subject.
- `JwtAuthGuard` tenant-aware.
- Roles declarativos mediante `Roles` y `RolesGuard`.
- Politica de passwords configurable.
- Historial de passwords.
- Bloqueo temporal por intentos fallidos.
- Reset password con token aleatorio, hash SHA-256 en base de datos y un solo uso.
- Auditoria de login, reset password y acciones administrativas.
- Invitaciones de staff por email usando token de activacion/reset.
- Alta de tenants protegida por `X-Onboarding-Token` contra `ONBOARDING_INVITE_TOKEN`.
- Headers de seguridad y CSP configurable.

Riesgos / pendientes:

- Sin pendientes tecnicos abiertos en esta seccion. `POST /auth/register-tenant` exige `X-Onboarding-Token` y los controllers principales usan `TenantRequest` / `OptionalTenantRequest`.

## 5. Multi-tenant

Estado: implementado y probado en e2e.

Implementado:

- Resolucion de tenant por subdominio y headers:
  - `X-Tenant-Slug`
  - `X-Tenant-ID`
- Validacion de consistencia entre JWT y tenant activo.
- Aislamiento por `restaurantId` en endpoints criticos.
- Indices tenant-aware y migraciones recientes para hardening.
- Prueba e2e que bloquea token/header de tenants distintos.

## 6. Dashboard API

Estado: funcional y cubierto parcialmente por e2e.

### Customers

Implementado:

- `GET /customers`
- `GET /customers?q=&take=&skip=`
- `GET /customers/:id`
- `CustomersController`, `CustomersService` y `CustomerRepository`.
- Busqueda por nombre, apellido, email y telefono.
- Perfil con metricas, reservas recientes, codigo de confirmacion y acciones de contacto.
- Aislamiento por tenant.
- Respuesta paginada `{ data, total, take, skip }` desde repositorio.

### Users / Staff

Implementado:

- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PATCH /users/:id`
- `UsersController`, `UsersService` y DTOs.
- Filtros por rol, estado y busqueda textual.
- Creacion de staff con password temporal o token de invitacion.
- Envio de invitacion por email.
- Cambio de rol y activacion/suspension.
- Proteccion de usuarios `OWNER`.
- Respuestas sin `passwordHash`.
- Auditoria de creacion, invitacion y actualizacion.

### Reservations

Implementado:

- `GET /reservations/today`
- `GET /reservations`
- Filtros por `date`, `from`, `to`, `status`, `source`, `q`, `take`, `skip`.
- `GET /reservations/:id`
- `POST /reservations`
- `PATCH /reservations/:id`
- `PATCH /reservations/:id/status`
- `PATCH /reservations/:id/cancel`
- `PATCH /reservations/:id/no-show`
- `GET /reservations/:id/cancellation-audits`
- `GET /reservations/:id/no-show-audits`
- Auditoria estructurada de cancelaciones.
- Auditoria estructurada dedicada para no-show en `reservation_no_show_audits`, ademas de `AuditLog` general.
- Revalidacion de disponibilidad al modificar horario, comensales o mesa desde dashboard.
- Reasignacion automatica a una mesa disponible cuando cambia horario/comensales y no se fuerza mesa concreta.
- Cancelacion sin contaminar `notes`: el motivo queda en `reservation_cancellation_audits`.
- Eventos realtime `reservation_updated`.

Riesgos / pendientes:

- Sin pendientes tecnicos abiertos en esta seccion.

### Restaurants / Settings / Tables

Implementado:

- Settings del restaurante activo.
- Zonas.
- Mesas.
- Analytics/reportes operativos.
- Endpoints legacy por slug para compatibilidad.
- `RestaurantsController` reducido a capa HTTP fina.
- Servicios separados para settings, zones, tables, analytics y legacy.
- DTOs explicitos con validadores `class-validator` para zones, tables, settings, legacy staff y meta credentials.
- Ruta tenant-aware sin slug para Meta credentials: `GET/PATCH /restaurants/meta-credentials`.
- El frontend de integraciones ya consume `/restaurants/meta-credentials`; las rutas legacy por slug quedan solo para compatibilidad hasta `Sunset: 2026-09-30`.

Riesgos / pendientes:

- Revisar despues del `Sunset: 2026-09-30` si se eliminan definitivamente los endpoints legacy por slug.

## 7. WhatsApp e IA

Estado: implementado para MVP; el soporte de audio queda pendiente de prueba real con Meta/STT.

Implementado:

- Verificacion webhook Meta.
- Recepcion de mensajes inbound.
- Validacion estructural con Zod.
- Validacion de firma `x-hub-signature-256` cuando `WHATSAPP_APP_SECRET` esta configurado.
- Cola BullMQ inbound.
- Worker asincrono de WhatsApp.
- Parser deterministico para flujo MVP.
- Estado conversacional en servicio dedicado.
- Integracion AI con proveedores mock/Ollama/Groq.
- DLQ para errores de worker.
- Descarga de audio corregida contra Graph API (`/{version}/{mediaId}`) y version configurable con `WHATSAPP_API_VERSION`.
- Validacion de firma webhook sobre raw body de la peticion.
- Trazas debug de WhatsApp/AI/reservas migradas a `Logger` o retiradas.

Riesgos / pendientes:

- Validar en entorno real de Meta que las notas de voz llegan con codec/tamano aceptado por el proveedor STT configurado. Requiere credenciales Meta y proveedor STT real.

## 8. Email y colas

Estado: implementado.

Implementado:

- `EmailService` con templates Handlebars.
- Templates:
  - forgot password
  - staff invitation
- `EmailQueue` con BullMQ.
- `EmailWorker`.
- Variables SMTP y worker configurables.
- Jobs desacoplados de la peticion HTTP.
- Mailpit configurado en `docker-compose.dev.yml` para SMTP local (`1025`) y UI (`8025`).
- Verificacion SMTP al arranque controlada por `SMTP_VERIFY_ON_START`; por defecto no bloquea desarrollo local fuera de Docker.
- Healthcheck especifico `GET /health/email` para SMTP y cola BullMQ/DLQ de email.
- Healthcheck agregado `GET /health/queues` para colas email y WhatsApp.
- Probes operativos `GET /health/live` y `GET /health/ready`; readiness valida DB y colas email/WhatsApp.
- Variables SMTP explicitas en `docker-compose.prod.yml` para API y Worker.

Riesgos / pendientes:

- Validar credenciales reales del proveedor SMTP en staging/prod y ajustar `SMTP_SECURE`/puerto segun proveedor. Requiere proveedor SMTP real.

Variables minimas para staging/prod:

```bash
export SMTP_HOST=smtp.example.com
export SMTP_PORT=587
export SMTP_USER=usuario
export SMTP_PASS=secreto
export SMTP_SECURE=false
export SMTP_VERIFY_ON_START=true
```

## 9. Frontend Angular

Estado: compila y ejecuta unit tests frontend en Chrome Headless Linux.

Implementado:

- Angular 19 standalone.
- Auth flow:
  - login
  - register tenant
  - forgot password
  - reset password
- Guards:
  - auth
  - guest
  - platform admin
- Interceptores:
  - auth
  - tenant
- Layout dashboard con sidebar.
- Pantallas:
  - reservations
  - customers
  - tables
  - settings
  - reports
  - integrations
  - users/staff
  - platform-admin
- Servicios HTTP para reservas, users, settings/restaurants y platform-admin.
- Socket.IO para eventos de reservas.
- El formulario de register tenant pide codigo de invitacion y lo envia como `X-Onboarding-Token`.
- `/customers` esta registrado en `app.routes.ts` y enlazado desde el sidebar.
- La UI de reservas captura `reasonCode` y `details` al cancelar o marcar no-show.
- El perfil de cliente expone acciones directas de llamada, WhatsApp y email cuando hay datos disponibles.
- Reportes operativos permiten consultar por rango `from`/`to` y consumen `GET /restaurants/reports/operational`.
- El panel platform/admin permite revisar restaurantes, estado operativo, observabilidad y billing persistido.
- `karma.conf.js` define `ChromeHeadlessNoSandbox` y `pnpm --filter web test:ci` autodetecta Chrome/Chromium Linux mediante `CHROME_BIN`.
- Integraciones Meta consume la ruta tenant-aware `/restaurants/meta-credentials` y ya no depende del slug legacy.

Riesgos / pendientes:

- Sin pendientes tecnicos abiertos en esta seccion. Google Chrome Linux quedo instalado y `pnpm --filter web test:ci` pasa en WSL.

## 10. Base de datos

Estado: esquema amplio y migraciones aplicadas localmente en e2e.

Implementado:

- Restaurantes.
- Usuarios y roles.
- Password reset tokens.
- Password history.
- Audit logs.
- Customers.
- Reservations.
- Reservation cancellation audits.
- Tables y zones.
- Opening hours, blocked dates y capacity rules.
- WhatsApp accounts y message logs.
- Billing SaaS por restaurante: plan, estado, email, referencia externa, fin de trial y fin de periodo.
- Auditoria estructurada de no-show en `reservation_no_show_audits`.
- Indices por tenant, fechas criticas y accesos reales del dashboard.
- Revision operativa de indices, soft-delete y cascadas documentada en `docs/database-operational-review.md`.
- Politica tecnica recomendada de retencion y bajas documentada en `docs/data-retention-policy.md`.

Verificacion:

- `prisma migrate deploy` no encontro migraciones pendientes durante `pnpm --filter api test:e2e`.
- `EXPLAIN ANALYZE` ejecutado con `apps/api/scripts/dashboard-explain.sql` sobre consultas reales de dashboard.
- Migracion `20260630010000_dashboard_query_indexes` aplicada localmente y verificada en `pg_indexes`.
- Migraciones `20260630020000_add_restaurant_billing_fields` y `20260630030000_add_reservation_no_show_audits` aplicadas localmente.

Riesgos / pendientes:

- Validar con criterios legales/producto la politica final de retencion/anonimizacion. La recomendacion tecnica ya esta documentada.

## 11. DevOps, Docker y CI/CD

Estado: Docker base implementado; CI minimo activo.

Implementado:

- `api.Dockerfile`.
- `web.Dockerfile`.
- `worker.Dockerfile`.
- `docker-compose.prod.yml` con Postgres, Redis, API, Worker y Web.
- API y worker separados mediante `WHATSAPP_WORKER_ENABLED`.
- Web con Nginx y proxy a API.
- `.github/workflows/ci.yml` ejecuta install, OpenAPI validate, Prisma generate, API build, Web build, Web unit tests, API e2e con Postgres service, empaquetado de `dist` y construccion/exportacion de imagenes Docker API/Web/Worker como artefactos de CI.
- `.github/workflows/release.yml` genera artefactos reproducibles `api-dist` y `web-dist` en ejecucion manual o tag `v*`.
- `.github/dependabot.yml` automatiza propuestas semanales para root, API, Web y GitHub Actions.
- Script de smoke post-deploy: `pnpm --filter api smoke` usando `API_BASE_URL`; valida `live`, `ready`, `health` y `openapi`.

Situacion actual de workflows:

- `.github/workflows/deploy.yml` queda intencionalmente pausado: no despliega ni requiere secretos hasta decidir proveedor cloud, registry, runtime y estrategia de secretos/OIDC.
- La automatizacion de release ya construye artefactos, pero no publica ni despliega.

Riesgos / pendientes:

- No hay despliegue cloud activo desde GitHub Actions; CD esta pausado para evitar fallos por falta de datos de nube.
- Falta decision final de proveedor y estrategia de secretos/OIDC.

## 12. Documentacion y contrato API

Estado: documentacion amplia, contrato API validado localmente.

Existe:

- Arquitectura.
- ADRs.
- Runbooks.
- Roles.
- Seguridad/hardening.
- Auditoria frontend.
- Postman collection.
- OpenAPI validado localmente.

Hallazgos:

- `docs/api/openapi.yml` fue saneado como JSON/YAML valido y se valida con `pnpm --filter api openapi:validate`.
- `/openapi.json` sirve el mismo contrato versionado de `docs/api/openapi.yml`.
- El documento anterior de status tenia pendientes ya resueltos, como `UsersService`, `CustomersService`, tests e2e de Dashboard API y DTOs principales.
- El documento de rol con typo `ai_assitant.md` fue consolidado en `ai_assistant.md`.

## 13. Verificaciones ejecutadas en este corte

```bash
pnpm --filter api build
pnpm --filter web build
pnpm --filter api openapi:validate
pnpm --filter api test:e2e
API_BASE_URL=http://localhost:3000/api/v1 pnpm --filter api smoke
pnpm --filter web test:ci
docker build -f infrastructure/docker/api.Dockerfile -t whatboo-api:ci-local .
docker build -f infrastructure/docker/web.Dockerfile -t whatboo-web:ci-local .
docker build -f infrastructure/docker/worker.Dockerfile --build-arg API_IMAGE=whatboo-api:ci-local -t whatboo-worker:ci-local .
node -e "const fs=require('fs'); const path=require('path'); const yaml=require('./node_modules/.pnpm/js-yaml@4.2.0/node_modules/js-yaml'); const files=fs.readdirSync('.github/workflows').filter(f=>f.endsWith('.yml')).map(f=>path.join('.github/workflows',f)).concat(['.github/dependabot.yml']); for (const file of files) yaml.load(fs.readFileSync(file, 'utf8'));"
git diff --check
```

Resultados:

- API build: OK.
- Web build: OK.
- OpenAPI validate: OK.
- API e2e: OK, 12 escenarios.
- Smoke API: script implementado; ejecutar contra una API viva con `API_BASE_URL`.
- Web unit tests: OK, 22 specs en Chrome Headless Linux.
- Docker images API/Web/Worker: OK, construidas localmente con los Dockerfiles productivos.
- Workflows GitHub Actions y Dependabot: YAML valido.
- `git diff --check`: OK.

Cobertura e2e API confirmada:

- Customers list/search/view tenant scoped.
- Reservations advanced list, update, status y structured cancel audit.
- Reservations update rechaza mesa no disponible y cancelacion conserva `notes` sin concatenar motivo.
- No-show registra auditoria estructurada dedicada sin contaminar `notes`.
- Users create/update/activate/deactivate tenant scoped.
- Platform admin lista y actualiza billing persistido para restaurantes.
- Tenant isolation entre header y token.
- Register tenant bloqueado sin token, bloqueado con token invalido y permitido con token de onboarding valido.
- WhatsApp webhook acepta firma valida calculada sobre raw body y rechaza firma invalida.
- Email healthcheck reporta SMTP y cola en estado sano.
- Queue healthcheck reporta colas email y WhatsApp.
- Liveness/readiness reportan estado operativo para despliegue.
- `/openapi.json` sirve el contrato validado.
- Frontend de integraciones Meta consume `/restaurants/meta-credentials` sin slug legacy.
- Frontend expone `/customers` y elimina trazas `console.*` de componentes/servicios revisados.
- Frontend envia motivos estructurados para cancelacion/no-show desde el dashboard.
- CI en `.github/workflows/ci.yml`: install, OpenAPI validate, Prisma generate, API build, Web build, Web unit tests, API e2e con Postgres service, artefactos de `dist` e imagenes Docker API/Web/Worker exportadas como artefactos.
- Release artifacts en `.github/workflows/release.yml` para API/Web.
- Backend sin `console.*` ni `req: any` en `apps/api/src`; el interceptor tenant usa `Logger` y request tipado.
- Respuestas paginadas dashboard normalizadas con `paginatedResponse` en customers, reservations, users y platform restaurants.
- Docs de rol AI consolidadas en `docs/roles/ai_assistant.md`.

## 14. Prioridades recomendadas

### Alta prioridad

- Validar audio WhatsApp con credenciales Meta y proveedor STT real antes de activar notas de voz en produccion.

### Media prioridad

- Eliminar endpoints legacy por slug de `RestaurantsController` despues de `Sunset: 2026-09-30`, si no hay consumidores externos.

### DevOps / Produccion

- Elegir proveedor final de despliegue.
- Migrar secretos a Secret Manager/Key Vault y usar OIDC.
- Desplegar API y Worker como servicios separados.
- Usar Postgres y Redis administrados.

### Producto

- Integrar proveedor real de billing y sincronizar `billingCustomerReference`/estado desde webhooks del proveedor elegido.
- Convertir el perfil de cliente en workspace CRM mas avanzado si se quieren tareas, etiquetas, timeline completo y notas internas.
- Definir KPIs/reportes comerciales adicionales sobre los reportes operativos actuales.
