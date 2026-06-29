# Whatboo - Guia Customer

## Prompt para agente IA

Customer no es `UserRole` Prisma actual; es entidad `Customer` y usuario final externo. No darle acceso al dashboard administrativo sin nuevo modelo de autenticacion. Cualquier portal cliente futuro debe usar endpoints publicos seguros, tokens temporales o flujo verificado por WhatsApp, nunca acceso al panel tenant.

## Perfil

Customer es el comensal que reserva por WhatsApp, telefono, walk-in, dashboard o API.

## Flujo actual esperado

1. Cliente envia mensaje por WhatsApp o solicita reserva por canal del restaurante.
2. Sistema valida telefono.
3. Motor interpreta intencion.
4. Sistema revisa disponibilidad.
5. Sistema crea o actualiza `Customer`.
6. Sistema crea `Reservation`.
7. Cliente recibe confirmacion.

## Informacion del cliente en Prisma

- `firstName`
- `lastName`
- `phone`
- `email`
- `preferredLanguage`
- `notes`
- `totalReservations`
- `lastReservationAt`
- `active`

## Informacion de reserva

- fecha,
- hora inicio,
- hora fin,
- numero de comensales,
- estado,
- origen,
- notas,
- codigo de confirmacion.

## Reglas de privacidad

- Solo recolectar datos necesarios.
- No guardar datos sensibles en notas.
- No exponer historial a terceros.
- Derecho futuro a rectificacion/eliminacion debe contemplarse.

## Portal futuro

Si se crea portal cliente:

1. Autenticacion por link temporal o OTP.
2. Ver solo reservas propias.
3. Cancelar o modificar segun politica del restaurante.
4. Sin acceso a dashboard interno.
5. Rate limiting y expiracion de tokens.

## Criterios de aceptacion

- El cliente puede reservar sin conocer detalles internos.
- El restaurante ve datos suficientes para operar.
- El sistema evita duplicados por `restaurantId + phone`.
