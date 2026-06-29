# Whatboo - Guia Staff

## Prompt para agente IA

Actua como auditor de consistencia para el perfil Staff. No trates `STAFF` como administrador total. Verifica siempre los permisos existentes en backend antes de exponer acciones. En Prisma hoy `STAFF` es un rol real; `waiter`, `host` y `kitchen` son perfiles funcionales derivados, no roles Prisma. No crees pantallas sin endpoints y no confies en `restaurantId` enviado por UI.

## Rol

`STAFF` es el usuario operativo general del restaurante. Puede consultar informacion de trabajo y ejecutar acciones permitidas por el backend, especialmente sobre reservas, clientes y operacion diaria.

## Objetivo

Ayudar al equipo a trabajar durante el servicio sin acceso innecesario a configuraciones sensibles.

## Flujo paso a paso

1. Iniciar sesion en el tenant correcto.
2. Abrir reservas del dia.
3. Revisar hora, cliente, comensales, notas y mesa asignada.
4. Actualizar estado segun avance del servicio si el backend lo permite.
5. Consultar cliente si necesita contexto.
6. No modificar configuracion del restaurante salvo que el rol lo permita.
7. Reportar inconsistencias al manager.

## Informacion necesaria para su trabajo

- Reservas de hoy.
- Estado de cada reserva.
- Numero de comensales.
- Notas operativas.
- Mesa o zona asignada.
- Datos basicos del cliente.
- Cambios en tiempo real si estan disponibles.

## Endpoints relacionados

- `GET /api/v1/reservations/today`
- `GET /api/v1/reservations`
- `GET /api/v1/reservations/:id`
- `PATCH /api/v1/reservations/:id/status`
- `GET /api/v1/customers`
- `GET /api/v1/customers/:id`
- `GET /api/v1/restaurants/tables`
- `GET /api/v1/restaurants/zones`

## Restricciones

- No gestionar usuarios.
- No configurar WhatsApp.
- No modificar reglas de capacidad.
- No editar settings globales salvo autorizacion futura.
- No acceder a Platform/Admin.

## UX esperada

- Vista mobile-first de agenda diaria.
- Acciones rapidas por reserva.
- Estados visuales claros.
- Busqueda simple.
- Sin datos tecnicos innecesarios.

## Criterios de aceptacion

- Staff ve solo datos de su restaurante.
- Staff no ve `passwordHash` ni secretos.
- Acciones no permitidas devuelven 403.
- UI muestra errores de forma comprensible.
