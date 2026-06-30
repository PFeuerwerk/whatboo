# Politica tecnica recomendada de retencion y bajas

Fecha de corte: 2026-06-30

Este documento fija una recomendacion tecnica inicial. La politica final debe validarse con requisitos legales, privacidad y operacion antes de produccion.

## AuditLog

- Mantener como registro append-only.
- No usar soft-delete operativo.
- Definir retencion por entorno:
  - Desarrollo: 30-90 dias.
  - Staging: 90-180 dias.
  - Produccion: 12-24 meses, segun obligacion legal y contractual.
- Para purga, usar job administrativo por fecha y tenant, nunca cascadas desde entidades de negocio.

## WhatsappInboundLog

- Mantener payloads el minimo tiempo operativo necesario.
- Recomendacion inicial:
  - Payload completo: 30-90 dias.
  - Metadatos tecnicos no sensibles: 180-365 dias.
- Antes de produccion, revisar si el payload contiene datos personales que deban anonimizarse.

## Customer

- Mantener `active=false` para baja operativa.
- Para solicitudes de privacidad, anonimizar campos personales manteniendo metricas historicas:
  - `firstName`, `lastName`, `email`, `phone`, `notes`.
- No borrar fisicamente clientes con reservas o auditoria asociada salvo proceso legalmente aprobado.

## WhatsappAccount

- Usar `status=INACTIVE` cuando una cuenta se desconecta.
- Usar `status=SUSPENDED` si la cuenta queda bloqueada por operacion/proveedor.
- Mantener historico de la cuenta para trazabilidad de mensajes y configuracion.
- Valorar `disconnectedAt` solo si se necesita reporte exacto de fecha de desconexion en producto.
