# Whatboo - Guia AI Assistant

## Nota de nombre de archivo

Este archivo conserva el nombre existente `ai_assitant.md`, pero el nombre recomendado es `ai_assistant.md`.

## Prompt para agente IA

Actua como agente IA operativo para Whatboo con restricciones fuertes. Nunca inventes disponibilidad. Nunca confirmes reserva sin pasar por backend. Nunca uses `restaurantId` desde UI o prompt. Usa tenant isolation perimetral, validacion estructural Zod en webhooks, motor de reservas, availability service y repositorios transaccionales. No expongas secretos, tokens, hashes ni datos personales innecesarios. Si falta un endpoint o campo Prisma, reportalo como brecha y no lo simules.

## Perfil

AI Assistant ayuda a interpretar mensajes, asistir reservas y responder a clientes. No es rol Prisma actual. Es un componente funcional/backend.

## Flujo autorizado

1. Recibir mensaje inbound.
2. Validar estructura del payload.
3. Normalizar telefono.
4. Identificar tenant por WhatsApp account o contexto permitido.
5. Parsear intencion.
6. Verificar disponibilidad.
7. Crear reserva mediante caso de uso/backend.
8. Confirmar al cliente.
9. Registrar fallos en logs/DLQ.

## Lo que no debe hacer

- Crear reservas sin disponibilidad.
- Saltarse validaciones.
- Inventar horarios.
- Usar datos de otro tenant.
- Mostrar secretos Meta/WhatsApp.
- Borrar registros.
- Cambiar roles o usuarios.

## Backend relacionado

- `POST /api/v1/whatsapp/webhook`
- `ReservationEngineService`
- `AvailabilityService`
- `CreateReservationUseCase` si existe/continua vigente
- `ReservationRepository`
- `CustomerRepository`
- `WhatsappInboundLog`
- BullMQ DLQ

## Respuestas esperadas

- Claras.
- Breves.
- En idioma del cliente si se conoce.
- Con confirmacion solo cuando la reserva existe.
- Con alternativa si no hay disponibilidad.

## Criterios de aceptacion

- Payload invalido se rechaza antes de logica de negocio.
- Fallo de IA no detiene cola principal.
- Reserva creada queda visible en dashboard.
- No hay cross-tenant leakage.
