Actúa como arquitecto senior full-stack, tech lead y auditor de consistencia para un monorepo SaaS llamado Whatboo. Verifica si primero si es posible desarrollar el "Panel platform/admin" consolidarlo, repararlo, actualizarlo si que esto afecte a lo que ya funciona actualmente.

Contexto técnico:
- Frontend: Angular 19.
- Backend: NestJS.
- Base de datos: PostgreSQL con Prisma 7.
- Infraestructura local: Redis, BullMQ, Docker.
- Arquitectura: SaaS multi-tenant para restaurantes.
- Multi-tenancy activo mediante slug/subdominio, cabecera X-Tenant-Slug, TenantInterceptor global en NestJS y tenantInterceptor funcional en Angular.
- El backend inyecta tenantId/restaurantId desde el perímetro y ninguna credencial ni restaurantId sensible debe quemarse en la UI.
- Estado estable actual:
  - pnpm --filter api exec tsc --noEmit --skipLibCheck debe dar 0 errores.
  - pnpm build debe compilar backend y frontend correctamente.
  - Tags Git estables:
    - stable-working-20260628
    - stable-tenant-isolation-20260628

Objetivo:
Construir el Panel Platform/Admin de forma profesional, robusta, escalable, responsive y alineada 100% con backend, base de datos y frontend.

Prioridades obligatorias:
1. Antes de crear código, auditar modelos Prisma, DTOs, controllers, services, guards, interceptors y rutas Angular existentes.
2. No inventar entidades ni campos si no existen en Prisma o backend.
3. No crear pantallas frontend sin endpoint backend correspondiente.
4. No crear endpoints backend sin revisar si ya existe módulo/controller/service relacionado.
5. Mantener separación clara:
   - Platform/Admin: administración global del SaaS.
   - Restaurant/Admin: administración de un restaurante específico.
6. Evitar inconsistencias futuras:
   - Tipos compartidos o interfaces frontend alineadas con DTO/backend.
   - Validaciones en backend con DTOs.
   - Guards por rol.
   - Tenant isolation obligatorio.
   - No confiar en datos enviados por la UI para restaurantId.
7. Todo cambio debe terminar con:
   - pnpm --filter api exec tsc --noEmit --skipLibCheck
   - pnpm build
   - git status
8. No romper funcionalidades existentes.
9. Cambios mínimos, profesionales y acumulativos.
10. Trabajar archivo por archivo.
11. No usar soluciones temporales, mocks falsos ni hardcoding innecesario.

Requisitos funcionales del Platform/Admin:
- Login seguro para usuario platform/admin o superadmin.
- Dashboard global con:
  - Total restaurantes.
  - Restaurantes activos/inactivos/suspendidos.
  - Total usuarios.
  - Total reservas globales.
  - Métricas básicas por tenant.
- Gestión de restaurantes:
  - Listar tenants.
  - Ver detalle tenant.
  - Activar/suspender tenant.
  - Editar datos básicos.
  - Ver configuración asociada.
- Gestión de usuarios platform:
  - Listar usuarios globales autorizados.
  - Roles claros.
  - Control de acceso.
- Observabilidad inicial:
  - Estado API.
  - Estado DB.
  - Estado Redis.
  - Últimos eventos importantes si existen datos.
- UI responsive:
  - Mobile-first.
  - Tablet y desktop.
  - Sidebar adaptable.
  - Cards limpias.
  - Tablas responsive.
  - Estados loading/error/empty.

Requisitos técnicos backend:
- Crear o extender módulos NestJS siguiendo arquitectura existente.
- Usar controllers/services/repositories si aplica.
- Proteger endpoints platform/admin con guard de JWT + rol.
- Nunca exponer secretos.
- Validar payloads con DTOs.
- Prisma queries explícitas y seguras.
- No saltarse tenant isolation en módulos tenant.
- Platform/Admin puede consultar globalmente solo si el rol lo permite.

Requisitos técnicos frontend:
- Angular 19 standalone.
- Rutas lazy-loaded.
- Guards para platform/admin.
- Servicios HTTP por dominio.
- Interfaces TypeScript alineadas con backend.
- No duplicar lógica.
- Interceptors existentes deben mantenerse activos.
- Manejo correcto de errores HTTP.
- Responsive profesional.

Flujo de trabajo obligatorio:
1. Inspeccionar estructura actual.
2. Identificar exactamente qué ya existe.
3. Proponer plan por fases.
4. Implementar primera fase mínima pero completa.
5. Validar compilación.
6. Corregir errores hasta 0.
7. Crear commit y tag estable.

Formato de respuesta deseado:
- Primero diagnóstico breve.
- Luego comandos exactos.
- Luego archivos completos o parches seguros.
- No explicaciones largas innecesarias.
- Priorizar comandos `nl -ba`, `awk`, `cat <<'EOF'`, `grep`, `find`.
- No usar nano.
- No decir “abre el archivo”.