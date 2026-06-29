# Whatboo - Contrato API y consistencia por roles

## Prompt para agente IA

Actua como auditor de contrato API para Whatboo. Cualquier propuesta debe alinear Angular 19, NestJS, Prisma 7 y PostgreSQL. Primero revisa schema Prisma, controllers, DTOs, services, guards, interceptors, rutas Angular e interfaces frontend. No inventes campos ni endpoints. Si un rol solicitado no existe en `UserRole`, documentalo como perfil funcional futuro. Todo endpoint tenant debe resolver `tenantId` por middleware/interceptor y no aceptar `restaurantId` desde UI. Todo endpoint platform debe exigir JWT y rol global. Finaliza cambios con TypeScript API, build monorepo y git status.

## Roles Prisma actuales

- `OWNER`
- `MANAGER`
- `STAFF`
- `ADMIN`
- `PLATFORM_ADMIN`

## Perfiles funcionales documentados

- Restaurant/Admin: `OWNER`, `MANAGER`; soporte con `ADMIN`, `PLATFORM_ADMIN`.
- Platform/Admin: `ADMIN`, `PLATFORM_ADMIN`.
- Staff: `STAFF`.
- Waiter: perfil futuro derivado de `STAFF`.
- Host: perfil futuro derivado de `STAFF`.
- Kitchen: perfil futuro derivado de `STAFF`.
- Customer: entidad `Customer`, no usuario dashboard.
- AI Assistant: componente funcional, no usuario Prisma.

## Reglas globales

- JWT obligatorio para dashboard.
- Tenant isolation obligatorio para rutas tenant.
- `restaurantId` no debe venir de la UI.
- `passwordHash` nunca se devuelve.
- Secretos Meta/WhatsApp nunca se devuelven al frontend.
- Validaciones backend obligatorias.
- Interfaces frontend deben reflejar respuestas backend.
- Las operaciones destructivas deben preferir soft delete/desactivacion.

## Endpoints Platform/Admin

- `GET /api/v1/platform/admin/dashboard`
- `GET /api/v1/platform/admin/restaurants`
- `GET /api/v1/platform/admin/restaurants/:id`
- `PATCH /api/v1/platform/admin/restaurants/:id`
- `PATCH /api/v1/platform/admin/restaurants/:id/status`
- `GET /api/v1/platform/admin/users`
- `GET /api/v1/platform/admin/observability`

## Endpoints Restaurant/Admin

- `GET /api/v1/restaurants/settings`
- `PATCH /api/v1/restaurants/settings`
- `GET /api/v1/restaurants/zones`
- `POST /api/v1/restaurants/zones`
- `PATCH /api/v1/restaurants/zones/:zoneId`
- `DELETE /api/v1/restaurants/zones/:zoneId`
- `GET /api/v1/restaurants/tables`
- `POST /api/v1/restaurants/tables`
- `PATCH /api/v1/restaurants/tables/:tableId`
- `DELETE /api/v1/restaurants/tables/:tableId`
- `GET /api/v1/restaurants/staff`
- `POST /api/v1/restaurants/staff`
- `PATCH /api/v1/restaurants/staff/:userId`
- `GET /api/v1/restaurants/analytics`

## Endpoints Users

- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `POST /api/v1/users`
- `PATCH /api/v1/users/:id`

## Endpoints Reservations

- `GET /api/v1/reservations/today`
- `GET /api/v1/reservations`
- `GET /api/v1/reservations/:id`
- `POST /api/v1/reservations`
- `PATCH /api/v1/reservations/:id`
- `PATCH /api/v1/reservations/:id/status`
- `PATCH /api/v1/reservations/:id/cancel`

## Endpoints Customers

- `GET /api/v1/customers`
- `GET /api/v1/customers?q=...`
- `GET /api/v1/customers/:id`

## Endpoints WhatsApp

- `POST /api/v1/whatsapp/webhook`
- `GET /api/v1/restaurants/:slug/meta-credentials`
- `PATCH /api/v1/restaurants/:slug/meta-credentials`

## Modelos Prisma principales

- `Restaurant`
- `User`
- `PasswordResetToken`
- `Customer`
- `Reservation`
- `RestaurantTable`
- `RestaurantZone`
- `WhatsappAccount`
- `OpeningHour`
- `BlockedDate`
- `CapacityRule`
- `ReservationTable`
- `WhatsappInboundLog`

## Contrato frontend

Angular debe mantener:

- standalone components,
- lazy routes,
- guards por dominio,
- services HTTP por dominio,
- interfaces TypeScript alineadas,
- tenant interceptor activo,
- manejo de loading/error/empty,
- responsive mobile-first,
- accesibilidad basica.

## Checklist antes de implementar

1. Revisar schema Prisma.
2. Revisar controller existente.
3. Revisar service/repository existente.
4. Revisar guard/interceptor.
5. Revisar ruta Angular.
6. Revisar interfaces frontend.
7. Confirmar permisos.
8. Confirmar endpoint.
9. Confirmar validacion DTO.
10. Confirmar pruebas/build.

## Checklist de cierre

```bash
pnpm --filter api exec tsc --noEmit --skipLibCheck
pnpm build
git status --short
```
