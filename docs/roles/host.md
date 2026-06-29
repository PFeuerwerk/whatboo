# Whatboo - Guia Host

## Prompt para agente IA

Trata Host como perfil operativo futuro, no como rol Prisma existente. Puede mapearse temporalmente a `STAFF` hasta que exista RBAC granular. Todo cambio debe respetar tenant isolation, disponibilidad, estados de reserva y no debe introducir `restaurantId` en UI.

## Perfil

Host es responsable de recibir clientes, controlar entradas, asignar mesas y mantener el flujo de reservas.

## Flujo paso a paso

1. Abrir reservas del dia.
2. Revisar proximas llegadas.
3. Buscar cliente por nombre o telefono.
4. Confirmar llegada.
5. Revisar disponibilidad de mesas.
6. Asignar o ajustar mesa si el backend lo permite.
7. Cancelar con motivo si el cliente no asiste o llama.
8. Marcar no-show cuando corresponda.

## Informacion necesaria

- Reservas ordenadas por hora.
- Estado de cada reserva.
- Capacidad solicitada.
- Mesas y zonas disponibles.
- Historial basico del cliente.
- Notas importantes.

## Endpoints actuales

- `GET /api/v1/reservations/today`
- `GET /api/v1/reservations?date=YYYY-MM-DD`
- `PATCH /api/v1/reservations/:id`
- `PATCH /api/v1/reservations/:id/status`
- `PATCH /api/v1/reservations/:id/cancel`
- `GET /api/v1/customers`
- `GET /api/v1/restaurants/tables`
- `GET /api/v1/restaurants/zones`

## Reglas de negocio

- No sobrepasar capacidad salvo regla explicita.
- Mantener historial de cancelacion en notas si aplica.
- No cambiar mesa a una mesa de otro tenant.
- No convertir no-show en cancelacion sin motivo.

## UX esperada

- Timeline del dia.
- Busqueda visible.
- Acciones rapidas: confirmar, cancelar, no-show, editar.
- Vista por zona/mesa.
- Estados claros y accesibles.

## Criterios de aceptacion

- Host encuentra una reserva en menos de 5 segundos.
- Acciones criticas piden confirmacion.
- Errores backend se muestran sin perder contexto.
