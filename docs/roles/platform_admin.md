# Whatboo - Guia Platform/Admin

## Prompt para agente IA

Actua como arquitecto senior full-stack y auditor de consistencia para Whatboo. Antes de proponer o modificar codigo relacionado con Platform/Admin, verifica Prisma, NestJS, DTOs, guards, interceptors, rutas Angular, servicios HTTP y modelos TypeScript. No inventes entidades, campos ni pantallas sin endpoint backend. Platform/Admin es administracion global del SaaS y solo puede operar con roles `ADMIN` o `PLATFORM_ADMIN`. No debe depender de `restaurantId` quemado en UI. Todo acceso debe usar JWT, validacion backend y consultas Prisma explicitas. Mantener Angular 19 standalone, NestJS, Prisma 7, PostgreSQL, Redis, BullMQ, Tailwind y responsive mobile-first. Cualquier implementacion debe terminar con `pnpm --filter api exec tsc --noEmit --skipLibCheck`, `pnpm build` y `git status`.

## Rol

Platform/Admin administra el SaaS completo. No gestiona la operacion diaria de una mesa o reserva salvo como soporte global. Su responsabilidad es ver salud del sistema, tenants, usuarios autorizados globales, configuracion basica de restaurantes y estado operativo de infraestructura.

Roles Prisma actuales permitidos:

- `PLATFORM_ADMIN`
- `ADMIN`

## Objetivos del panel

- Ver metricas globales del SaaS.
- Listar restaurantes/tenants.
- Ver detalle de cada tenant.
- Activar, inactivar o suspender restaurantes.
- Editar datos basicos no sensibles.
- Ver usuarios globales autorizados.
- Ver estado inicial de API, DB y Redis.
- Revisar eventos recientes disponibles en backend.

## Flujo paso a paso

1. Entrar al login con un usuario `PLATFORM_ADMIN` o `ADMIN`.
2. Confirmar que el sistema redirige al shell autenticado.
3. Abrir `Platform Admin` desde la navegacion.
4. Revisar tarjetas globales:
   - total de restaurantes,
   - activos,
   - suspendidos,
   - usuarios,
   - reservas.
5. Usar busqueda de tenants por nombre, slug, email, ciudad o pais.
6. Filtrar por estado `ACTIVE`, `INACTIVE` o `SUSPENDED`.
7. Abrir detalle del tenant.
8. Revisar configuracion asociada:
   - duracion por defecto,
   - intervalo de slots,
   - buffer,
   - cuentas WhatsApp,
   - horarios,
   - reglas de capacidad.
9. Editar datos basicos si corresponde.
10. Suspender un tenant solo si existe motivo operativo o contractual.
11. Revisar usuarios platform.
12. Revisar observabilidad: API, DB, Redis y eventos recientes.

## Backend esperado

Endpoints existentes:

- `GET /api/v1/platform/admin/dashboard`
- `GET /api/v1/platform/admin/restaurants`
- `GET /api/v1/platform/admin/restaurants/:id`
- `PATCH /api/v1/platform/admin/restaurants/:id`
- `PATCH /api/v1/platform/admin/restaurants/:id/status`
- `GET /api/v1/platform/admin/users`
- `GET /api/v1/platform/admin/observability`

Validaciones obligatorias:

- JWT requerido.
- Rol `ADMIN` o `PLATFORM_ADMIN`.
- `status` debe pertenecer a `RestaurantStatus`.
- No exponer secretos.
- No devolver `passwordHash`.
- No depender de tenant middleware para rutas globales.

## Prisma involucrado

- `Restaurant`
- `User`
- `Reservation`
- `Customer`
- `RestaurantTable`
- `WhatsappAccount`
- `OpeningHour`
- `CapacityRule`
- `WhatsappInboundLog`

## Frontend esperado

Ruta:

- `/platform-admin`

Piezas Angular:

- `platformAdminGuard`
- `PlatformAdminService`
- `PlatformDashboard`
- `PlatformRestaurantListItem`
- `PlatformRestaurantDetail`
- `PlatformUser`
- `PlatformObservability`
- `SystemAdminComponent`

La UI debe tener:

- loading,
- error,
- empty states,
- tablas responsive,
- filtros,
- formularios compactos,
- botones claros para activar/suspender,
- cero IDs sensibles visibles innecesariamente.

## Criterios de aceptacion

- Usuario sin rol platform no accede.
- Usuario platform puede ver dashboard global.
- Listado de tenants respeta filtros.
- Suspender tenant actualiza backend y UI.
- Observabilidad no rompe si Redis falla.
- Build completo pasa sin errores.
- No se exponen secretos ni hashes.

## Tareas futuras

- Agregar auditoria formal de acciones platform.
- Agregar historial de cambios por tenant.
- Agregar paginacion avanzada.
- Agregar RBAC granular si se crean permisos por modulo.
- Agregar exportaciones seguras para soporte.
