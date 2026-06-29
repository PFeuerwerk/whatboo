# Whatboo - Guia Waiter

## Prompt para agente IA

Documenta Waiter como perfil operativo futuro derivado de `STAFF`, no como `UserRole` Prisma actual. Si se implementa como rol real, primero actualizar Prisma, migraciones, DTOs, guards, frontend types y seeds. No inventar permisos backend.

## Perfil

Waiter es el camarero. Su foco es saber que mesas tiene, cuantos comensales llegan, notas importantes y estado de servicio.

## Flujo paso a paso

1. Entrar al panel desde movil o tablet.
2. Abrir vista de reservas del dia.
3. Revisar mesas asignadas.
4. Confirmar llegada del cliente con el host si aplica.
5. Leer notas operativas.
6. Marcar reserva como completada solo si el flujo del restaurante lo permite.
7. Informar no-show al host o manager.

## Informacion necesaria

- Mesa.
- Zona.
- Hora.
- Numero de comensales.
- Nombre del cliente.
- Notas.
- Estado.

## Backend actual asociado

- `Reservation`
- `ReservationTable`
- `RestaurantTable`
- `RestaurantZone`
- `Customer`

Endpoints de lectura:

- `GET /api/v1/reservations/today`
- `GET /api/v1/restaurants/tables`
- `GET /api/v1/restaurants/zones`

## Reglas futuras si se crea rol real

- Crear enum `WAITER` o sistema RBAC granular.
- Definir guard por accion.
- Permitir lectura de reservas y mesas.
- Restringir settings, usuarios y WhatsApp.
- Auditar cambios de estado.

## UX esperada

- Lista compacta por hora.
- Filtros por zona.
- Vista usable con una mano.
- Botones grandes.
- Sin formularios largos.

## Criterios de aceptacion

- No puede ver datos de otros restaurantes.
- No puede modificar configuracion.
- Puede obtener rapidamente informacion de su servicio.
