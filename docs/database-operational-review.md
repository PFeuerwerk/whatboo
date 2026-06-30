# Revision operativa de base de datos

Fecha: 2026-06-30

## Indices revisados con queries reales

Se revisaron consultas usadas por dashboard y servicios NestJS:

- Agenda/lista de reservas por tenant y rango.
- Reservas filtradas por estado, fuente y rango.
- Perfil de cliente con historial de reservas.
- CRM de clientes ordenado por actividad.
- Mesas y zonas activas del plano.
- Disponibilidad de mesas por ventana horaria.
- Auditoria de cancelaciones por reserva.
- Usuarios/staff por tenant, rol, estado y email.

Resultado local:

- La base local tiene pocos registros, por lo que `EXPLAIN ANALYZE` elige `Seq Scan` en varias consultas aunque existan indices utiles.
- Los accesos de reservas ya estaban cubiertos parcialmente por indices tenant-aware creados en `20260629001000_add_tenant_partial_indexes`.
- Se anadio `20260630010000_dashboard_query_indexes` para cubrir los accesos que faltaban con cardinalidad de produccion.

Indices agregados:

- `customers_tenant_active_dashboard_order_idx`: lista CRM por tenant activo y orden de actividad.
- `restaurant_tables_tenant_active_capacity_idx`: candidatos de disponibilidad por capacidad.
- `reservations_tenant_active_status_window_idx`: ventana de disponibilidad con estado y solape horario.
- `reservation_cancellation_audits_tenant_reservation_created_idx`: auditoria de cancelacion por reserva ordenada por fecha.
- `users_tenant_role_active_email_idx`: staff por tenant, rol, estado y email.

Script reproducible:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/scripts/dashboard-explain.sql
```

## Soft-delete y cascadas

Decision recomendada para produccion: conservar historial operativo y evitar borrados fisicos de entidades de negocio con reservas, auditoria o trazabilidad. Las eliminaciones de negocio deben ser soft-delete o desactivacion; las cascadas quedan reservadas para datos estrictamente dependientes y regenerables.

Matriz por modelo:

| Modelo | Estado actual | Decision recomendada |
| --- | --- | --- |
| `Restaurant` | `deletedAt`; auditoria con `onDelete: Restrict` | Mantener soft-delete. No cascadar datos operativos. |
| `User` | `isActive`; tokens/history con cascade | Mantener desactivacion para staff. Cascada solo en `PasswordResetToken` y `PasswordHistory`. |
| `Customer` | `active` sin `deletedAt` | Mantener desactivacion por ahora; antes de produccion valorar `deletedAt` si hay requerimientos GDPR/anonimizacion. |
| `Reservation` | `deletedAt` | Mantener soft-delete. No cascadar desde cliente/restaurante. |
| `ReservationTable` | Join sin soft-delete | Cascada aceptable al borrar fisicamente una reserva/mesa, pero la app debe preferir borrar/recrear asignaciones operativas. |
| `ReservationCancellationAudit` | Sin soft-delete | No borrar ni cascadar en flujos normales; conservar trazabilidad. |
| `RestaurantTable` | `active` sin `deletedAt` | Mantener desactivacion; no borrar si tuvo reservas. |
| `RestaurantZone` | `active` sin `deletedAt` | Mantener desactivacion; ya bloquea desactivar con mesas activas. |
| `OpeningHour` | `deletedAt` | Mantener soft-delete para historial de configuracion. |
| `BlockedDate` | `deletedAt` | Mantener soft-delete. |
| `CapacityRule` | `deletedAt` | Mantener soft-delete. |
| `WhatsappAccount` | Sin soft-delete | Antes de produccion anadir desactivacion/estado operativo suficiente o `deletedAt` si se requiere baja trazable. |
| `WhatsappInboundLog` | Sin soft-delete | Retencion por politica, no cascada operacional. |
| `AuditLog` | Sin soft-delete | Retencion por politica, no cascada operacional. |

Pendientes especificos antes de produccion:

- Definir politica de retencion para `AuditLog` y `WhatsappInboundLog`.
- Definir si `Customer` necesita anonimizacion o `deletedAt` ademas de `active`.
- Definir baja trazable de `WhatsappAccount` si se desconecta Meta/WhatsApp.
- Evitar endpoints de borrado fisico sobre entidades operativas salvo tareas internas controladas.
