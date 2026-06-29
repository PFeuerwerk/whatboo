import { Controller, Get } from '@nestjs/common';

@Controller('openapi.json')
export class OpenApiController {
  @Get()
  getDocument() {
    return {
      openapi: '3.0.3',
      info: {
        title: 'Whatboo API',
        version: '2026.06.29',
        description: 'Contrato OpenAPI inicial para Dashboard API, Platform/Admin y flujos tenant multi-restaurante.',
      },
      servers: [{ url: '/api/v1' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          tenantSlug: { type: 'apiKey', in: 'header', name: 'X-Tenant-Slug' },
        },
      },
      security: [{ bearerAuth: [], tenantSlug: [] }],
      paths: {
        '/customers': {
          get: {
            tags: ['Dashboard Customers'],
            summary: 'Listar y buscar clientes del tenant actual',
            parameters: [
              { name: 'q', in: 'query', schema: { type: 'string' } },
              { name: 'take', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
              { name: 'skip', in: 'query', schema: { type: 'integer', minimum: 0 } },
            ],
            responses: { '200': { description: 'Respuesta paginada de clientes' } },
          },
        },
        '/customers/{id}': {
          get: {
            tags: ['Dashboard Customers'],
            summary: 'Ver perfil de cliente aislado por tenant',
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: { '200': { description: 'Cliente' }, '404': { description: 'No encontrado' } },
          },
        },
        '/reservations': {
          get: {
            tags: ['Dashboard Reservations'],
            summary: 'Listar reservas con paginacion y filtros avanzados',
            parameters: [
              { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
              { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
              { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
              { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'] } },
              { name: 'source', in: 'query', schema: { type: 'string', enum: ['WHATSAPP', 'DASHBOARD', 'PHONE', 'WALK_IN', 'API'] } },
              { name: 'q', in: 'query', schema: { type: 'string' } },
              { name: 'take', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
              { name: 'skip', in: 'query', schema: { type: 'integer', minimum: 0 } },
            ],
            responses: { '200': { description: 'Respuesta paginada de reservas' } },
          },
          post: { tags: ['Dashboard Reservations'], summary: 'Crear reserva manual', responses: { '201': { description: 'Reserva creada' } } },
        },
        '/reservations/{id}': {
          get: { tags: ['Dashboard Reservations'], summary: 'Ver reserva', responses: { '200': { description: 'Reserva' } } },
          patch: { tags: ['Dashboard Reservations'], summary: 'Actualizar reserva', responses: { '200': { description: 'Reserva actualizada' } } },
        },
        '/reservations/{id}/status': {
          patch: { tags: ['Dashboard Reservations'], summary: 'Actualizar estado excepto cancelacion', responses: { '200': { description: 'Reserva actualizada' }, '400': { description: 'Usar endpoint de cancelacion para CANCELLED' } } },
        },
        '/reservations/{id}/cancel': {
          patch: { tags: ['Dashboard Reservations'], summary: 'Cancelar reserva con motivo estructurado', responses: { '200': { description: 'Reserva cancelada' } } },
        },
        '/reservations/{id}/cancellation-audits': {
          get: { tags: ['Dashboard Reservations'], summary: 'Auditoria de cancelacion', responses: { '200': { description: 'Eventos de cancelacion' } } },
        },
        '/users': {
          get: { tags: ['Dashboard Users'], summary: 'Listar staff con paginacion', responses: { '200': { description: 'Respuesta paginada de usuarios' } } },
          post: { tags: ['Dashboard Users'], summary: 'Crear staff', responses: { '201': { description: 'Usuario creado' } } },
        },
        '/users/{id}': {
          get: { tags: ['Dashboard Users'], summary: 'Ver staff', responses: { '200': { description: 'Usuario' } } },
          patch: { tags: ['Dashboard Users'], summary: 'Actualizar staff, activar o desactivar', responses: { '200': { description: 'Usuario actualizado' } } },
        },
        '/platform/admin/dashboard': {
          get: { tags: ['Platform Admin'], summary: 'Metricas globales SaaS', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Dashboard global' } } },
        },
      },
    };
  }
}
