# Whatboo - Guia Restaurant/Admin

## Prompt para agente IA

Actua como arquitecto senior full-stack, product owner tecnico y auditor de consistencia para el panel Restaurant/Admin de Whatboo. Este documento es simultaneamente manual de usuario, especificacion funcional, UX, backend, frontend, contrato Prisma, contrato API, documento de aceptacion, documento para IA y QA. Antes de crear codigo, inspecciona Prisma, DTOs, controllers, services, guards, interceptors y rutas Angular existentes. No inventes campos. No crees pantalla sin endpoint backend. No crees endpoint sin revisar modulo relacionado. Mantener separacion entre Platform/Admin global y Restaurant/Admin tenant. El backend debe inyectar `tenantId` desde middleware/interceptor perimetral; la UI nunca debe enviar `restaurantId` sensible. Mantener Angular 19 standalone, NestJS, Prisma 7, PostgreSQL, Redis, BullMQ, Tailwind, accesibilidad y responsive mobile-first. Toda implementacion debe terminar con `pnpm --filter api exec tsc --noEmit --skipLibCheck`, `pnpm build` y `git status`.

## Rol

Restaurant/Admin representa el propietario o gerente autorizado del restaurante. En Prisma hoy corresponde principalmente a:

- `OWNER`
- `MANAGER`
- tambien pueden operar `ADMIN` y `PLATFORM_ADMIN` cuando actuan como soporte autorizado.

## Objetivo principal

Configurar el restaurante para que el motor de reservas, WhatsApp, disponibilidad, staff, mesas, zonas, horarios, clientes y reportes funcionen de forma consistente.

## Primer login: flujo obligatorio

1. Iniciar sesion con email, password y slug del restaurante.
2. Verificar que el interceptor Angular adjunte `X-Tenant-Slug`.
3. Confirmar que el backend resuelve `tenantId`.
4. Entrar a `Settings`.
5. Completar configuracion general.
6. Crear zonas del restaurante.
7. Crear mesas y capacidades.
8. Crear usuarios/staff.
9. Configurar horarios.
10. Configurar reglas de capacidad.
11. Configurar WhatsApp.
12. Crear una reserva de prueba.
13. Confirmar que la reserva aparece en dashboard y reportes.

## Configuracion general

Datos soportados por Prisma `Restaurant`:

- `name`
- `timezone`
- `currency`
- `locale`
- `defaultReservationDuration`
- `slotIntervalMinutes`
- `bufferTimeMinutes`
- `maxCapacity`
- `allowWaitlist`
- `autoConfirm`

El usuario debe:

1. Confirmar nombre comercial.
2. Seleccionar zona horaria real.
3. Confirmar moneda.
4. Confirmar idioma/localizacion.
5. Definir duracion por defecto de reserva.
6. Definir intervalo de slots.
7. Definir buffer entre reservas.
8. Definir capacidad maxima diaria si aplica.
9. Activar o desactivar lista de espera.
10. Activar o desactivar confirmacion automatica.

Backend:

- `GET /api/v1/restaurants/settings`
- `PATCH /api/v1/restaurants/settings`

Validaciones:

- Solo roles de gestion.
- Valores numericos positivos.
- `slotIntervalMinutes` coherente.
- `tenantId` desde request, nunca desde body.

## Zonas del restaurante

Ejemplos:

- Salon central.
- Terraza.
- Privado.
- Barra.
- Planta alta.

Prisma:

- `RestaurantZone.name`
- `RestaurantZone.priority`
- `RestaurantZone.active`

Flujo:

1. Abrir modulo de mesas o configuracion.
2. Crear zona con nombre claro.
3. Definir prioridad de llenado.
4. Guardar.
5. Verificar que la zona aparece para asignar mesas.

Endpoints:

- `GET /api/v1/restaurants/zones`
- `POST /api/v1/restaurants/zones`
- `PATCH /api/v1/restaurants/zones/:zoneId`
- `DELETE /api/v1/restaurants/zones/:zoneId`

Reglas:

- No duplicar nombre dentro del mismo restaurante.
- No desactivar zona con mesas activas.
- Ordenar por prioridad y nombre.

## Mesas

Prisma:

- `RestaurantTable.name`
- `RestaurantTable.capacity`
- `RestaurantTable.zoneId`
- `RestaurantTable.active`

El usuario debe:

1. Crear cada mesa fisica real.
2. Asignar zona.
3. Indicar numero maximo de comensales.
4. Mantener nombres operativos: `T1`, `T2`, `P1`, `Terraza 4`.
5. Desactivar mesas que no esten disponibles.

Endpoints:

- `GET /api/v1/restaurants/tables`
- `POST /api/v1/restaurants/tables`
- `PATCH /api/v1/restaurants/tables/:tableId`
- `DELETE /api/v1/restaurants/tables/:tableId`

Criterios:

- Capacidad minima 1.
- Nombre unico por restaurante.
- Zona debe pertenecer al tenant.
- Desactivar no debe borrar historial.

## Staff y usuarios

Roles Prisma actuales para restaurante:

- `OWNER`: control maximo del tenant.
- `MANAGER`: gestion operativa.
- `STAFF`: usuario operativo general.

Flujo:

1. Abrir `Users`.
2. Crear usuario con email, nombre, apellido, rol y password temporal.
3. Entregar credenciales por canal seguro.
4. Activar/desactivar segun rotacion.
5. No compartir usuarios entre empleados.

Endpoints:

- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `POST /api/v1/users`
- `PATCH /api/v1/users/:id`
- Legacy relacionado:
  - `GET /api/v1/restaurants/staff`
  - `POST /api/v1/restaurants/staff`
  - `PATCH /api/v1/restaurants/staff/:userId`

Reglas:

- Solo `OWNER` puede crear/modificar otro `OWNER`.
- No devolver `passwordHash`.
- Email unico por restaurante.
- Password temporal minimo 8 caracteres.

## Horarios

Prisma:

- `OpeningHour.dayOfWeek`
- `OpeningHour.openTime`
- `OpeningHour.closeTime`
- `OpeningHour.isClosed`
- `OpeningHour.active`

Flujo:

1. Definir cada dia de la semana.
2. Marcar dias cerrados.
3. Configurar apertura y cierre.
4. Guardar cambios.
5. Crear reserva de prueba dentro y fuera de horario.

Endpoint:

- `PATCH /api/v1/restaurants/settings` con `openingHours`.

Reglas:

- Formato de hora consistente.
- Un registro por dia y restaurante.
- No permitir reservas fuera de horario.

## Reglas de capacidad

Prisma:

- `CapacityRule.maxGuestsPerReservation`
- `CapacityRule.maxReservationsPerSlot`
- `CapacityRule.slotDurationMinutes`
- `CapacityRule.bufferMinutes`
- `CapacityRule.maxDailyCapacity`
- `CapacityRule.overbookingAllowed`

Flujo:

1. Definir maximo de comensales por reserva.
2. Definir maximo de reservas por slot.
3. Definir duracion de slot.
4. Definir buffer.
5. Definir capacidad diaria.
6. Decidir si se permite overbooking.

Regla profesional:

- Overbooking debe estar desactivado por defecto.
- Cualquier overbooking futuro debe quedar auditado.

## Reservas

Endpoints:

- `GET /api/v1/reservations`
- `GET /api/v1/reservations/today`
- `GET /api/v1/reservations/:id`
- `POST /api/v1/reservations`
- `PATCH /api/v1/reservations/:id`
- `PATCH /api/v1/reservations/:id/status`
- `PATCH /api/v1/reservations/:id/cancel`

Estados Prisma:

- `PENDING`
- `CONFIRMED`
- `CANCELLED`
- `COMPLETED`
- `NO_SHOW`

Flujo operativo:

1. Revisar reservas del dia.
2. Filtrar por fecha si aplica.
3. Crear reserva manual solo con datos validos.
4. Confirmar reserva cuando procede.
5. Cancelar con motivo.
6. Marcar completada o no-show al final del servicio.

## Clientes

Endpoints:

- `GET /api/v1/customers`
- `GET /api/v1/customers?q=...`
- `GET /api/v1/customers/:id`

Prisma:

- `Customer.phone`
- `Customer.email`
- `Customer.firstName`
- `Customer.lastName`
- `Customer.preferredLanguage`
- `Customer.notes`
- `Customer.totalReservations`
- `Customer.lastReservationAt`

Uso:

1. Buscar cliente por nombre, telefono o email.
2. Revisar historial.
3. Usar notas con cuidado y sin datos sensibles innecesarios.

## WhatsApp

Prisma:

- `WhatsappAccount.phoneNumber`
- `WhatsappAccount.displayName`
- `WhatsappAccount.status`

Endpoints actuales:

- `GET /api/v1/restaurants/:slug/meta-credentials`
- `PATCH /api/v1/restaurants/:slug/meta-credentials`
- `POST /api/v1/whatsapp/webhook`

Reglas:

- No exponer tokens reales al frontend.
- Validar payloads antes del motor de reservas.
- Registrar fallos en `WhatsappInboundLog`.
- Mantener DLQ para payloads fallidos.

## IA y motor de reservas

El Restaurant/Admin no debe configurar prompts tecnicos en produccion sin controles. La IA debe apoyar, no saltarse reglas.

Flujo esperado:

1. Mensaje inbound de WhatsApp.
2. Validacion estructural.
3. Parsing de intencion.
4. Check de disponibilidad.
5. Creacion de reserva.
6. Confirmacion al cliente.
7. Evento en dashboard.

## Responsive y accesibilidad

Cada pantalla debe:

- funcionar en movil, tablet y desktop,
- tener labels visibles o accesibles,
- manejar loading/error/empty,
- evitar tablas imposibles en movil,
- permitir acciones criticas con confirmacion,
- no depender solo de color.

## Criterios de aceptacion

- Un restaurante nuevo puede quedar operativo sin tocar base de datos manualmente.
- Mesas, zonas, horarios y capacidad alimentan disponibilidad.
- Staff se crea sin filtrar credenciales.
- Reservas respetan tenant y capacidad.
- WhatsApp no expone secretos.
- Build completo pasa.

## Roadmap futuro

- Wizard inicial guiado.
- Permisos granulares por perfil operativo.
- Roles especificos `HOST`, `WAITER`, `KITCHEN` si se decide en Prisma.
- Auditoria de cambios.
- Importacion masiva de mesas.
- Plano visual de restaurante.
