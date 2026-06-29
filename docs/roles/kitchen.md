# Whatboo - Guia Kitchen

## Prompt para agente IA

Kitchen es perfil funcional futuro. No existe como `UserRole` Prisma actual. Antes de implementarlo, definir si cocina necesita acceso autenticado, eventos en tiempo real, pantalla de produccion o solo lectura agregada de reservas. No mostrar datos personales innecesarios.

## Perfil

Kitchen necesita anticipar carga de trabajo: comensales por franja, notas relevantes y ritmo de llegada. No administra clientes, usuarios, WhatsApp ni configuracion.

## Flujo paso a paso

1. Abrir panel de cocina.
2. Ver resumen por hora.
3. Revisar numero total de comensales.
4. Ver notas operativas permitidas.
5. Identificar picos de servicio.
6. Marcar preparacion interna solo si existe modulo futuro.

## Informacion necesaria

- Hora.
- Comensales por slot.
- Reservas confirmadas.
- Notas operativas no sensibles.
- Alertas de grupos grandes.

## Backend actual asociado

- `Reservation`
- `ReservationStatus`
- `ReservationSource`
- `CapacityRule`

Endpoints actuales utiles:

- `GET /api/v1/reservations/today`
- `GET /api/v1/restaurants/analytics`

## Datos que no debe ver

- Passwords.
- Tokens.
- Configuracion WhatsApp.
- Administracion de usuarios.
- Datos personales extensos de clientes si no son necesarios.

## UX esperada

- Pantalla grande legible.
- Modo tablet.
- Agrupacion por franja horaria.
- Alto contraste.
- Actualizacion en tiempo real cuando exista evento.

## Roadmap

- Crear vista Kitchen Display.
- Crear permisos granulares.
- Crear agregados backend optimizados.
- Evitar polling agresivo; preferir websockets/eventos.
