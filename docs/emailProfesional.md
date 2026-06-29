# Arquitectura Empresarial del Subsistema de Correo Electrónico (Email) – Whatboo

## Objetivo

Diseñar e implementar el subsistema de correo electrónico de Whatboo como un componente transversal, desacoplado y preparado para producción, capaz de operar desde las primeras fases de desarrollo hasta un entorno empresarial con cientos o miles de restaurantes (multi-tenant) sin requerir refactorizaciones de la lógica de negocio.

La arquitectura deberá mantenerse completamente independiente del proveedor de infraestructura utilizado para el envío de correos electrónicos. Cualquier cambio de proveedor deberá realizarse exclusivamente mediante configuración externa, sin modificar el código fuente del backend, frontend ni la estructura de la base de datos.

Este documento constituye la especificación técnica oficial que deberá seguir cualquier desarrollador o agente de Inteligencia Artificial encargado de implementar, mantener o evolucionar el subsistema de correo electrónico de Whatboo.

---

# Objetivos Arquitectónicos

La implementación deberá cumplir obligatoriamente los siguientes principios:

* Arquitectura Enterprise Ready.
* Arquitectura Cloud Native.
* Arquitectura Multi-Tenant.
* Escalabilidad horizontal.
* Alta disponibilidad.
* Alta resiliencia.
* Bajo acoplamiento (Low Coupling).
* Alta cohesión (High Cohesion).
* Inversión de dependencias (Dependency Inversion Principle).
* Configuración completamente externa.
* Compatibilidad con múltiples entornos de ejecución.
* Observabilidad completa.
* Seguridad por diseño (Security by Design).
* Preparada para despliegues distribuidos.
* Preparada para ejecución Stateless.
* Compatible con ejecución en contenedores.
* Preparada para entornos Kubernetes o plataformas Serverless.
* Optimizada para minimizar futuras refactorizaciones.

---

# Objetivos Funcionales

El subsistema de correo electrónico no tendrá como único propósito enviar mensajes.

Su función será proporcionar una infraestructura empresarial reutilizable para todas las comunicaciones transaccionales del SaaS, incluyendo tanto las funcionalidades actuales como cualquier ampliación futura.

La implementación deberá permitir escalar desde un único restaurante hasta miles de restaurantes utilizando exactamente la misma arquitectura.

La incorporación de nuevas funcionalidades nunca deberá requerir modificaciones estructurales del subsistema.

---

# Contexto Tecnológico Actual

La implementación deberá respetar y alinearse completamente con la arquitectura existente del proyecto.

## Frontend

* Angular 19

## Backend

* NestJS

## ORM

* Prisma 7

## Base de Datos

* PostgreSQL

## Sistema de Caché y Colas

* Redis
* BullMQ

## Motor de Plantillas

* Handlebars

## Cliente SMTP

* Nodemailer

## Arquitectura Multi-Tenant

* TenantInterceptor
* Resolución dinámica del restaurante mediante Tenant Slug
* Obtención de `restaurantId` exclusivamente desde el backend
* Aislamiento perimetral entre restaurantes
* Prohibido confiar en identificadores enviados por el frontend

---

# Objetivo de Integración

Toda implementación deberá mantenerse completamente alineada con la arquitectura existente del proyecto.

El subsistema de correo electrónico deberá integrarse de forma transparente con:

* Angular 19.
* NestJS.
* Prisma.
* PostgreSQL.
* Redis.
* BullMQ.
* Sistema Multi-Tenant.
* Sistema de autenticación.
* Sistema de reservas.
* Sistema de usuarios.
* Sistema de notificaciones.
* Futuras integraciones del ecosistema Whatboo.

No se permitirá introducir inconsistencias entre frontend, backend, base de datos, contratos API, DTOs, entidades Prisma ni reglas de negocio.

Toda modificación deberá preservar la compilación completa del proyecto y mantener una arquitectura limpia, consistente y preparada para la evolución futura del SaaS.

---

# Principio Arquitectónico

La arquitectura del subsistema de correo electrónico deberá respetar estrictamente los principios de Clean Architecture, SOLID y Domain-Driven Design (DDD), garantizando un diseño desacoplado, mantenible y preparado para evolucionar durante toda la vida útil del proyecto.

El sistema deberá cumplir obligatoriamente las siguientes reglas:

* La lógica de negocio nunca dependerá de un proveedor de infraestructura.
* La lógica de negocio nunca conocerá detalles de implementación del transporte SMTP.
* El envío de correos electrónicos será considerado un servicio transversal de la plataforma.
* Toda la configuración deberá realizarse externamente mediante variables de entorno o sistemas de gestión de secretos.
* Ningún cambio de infraestructura deberá requerir modificaciones del código fuente.
* El sistema deberá ser completamente independiente del servidor SMTP utilizado.
* La arquitectura deberá ser compatible con cualquier implementación estándar del protocolo SMTP.

---

# Contrato Arquitectónico

La aplicación únicamente conocerá un único punto de entrada para todas las operaciones relacionadas con el correo electrónico.

```
Application
        │
        ▼
Business Modules
        │
        ▼
EmailService
        │
        ▼
SMTP Transport
        │
        ▼
Servidor SMTP
```

La implementación del transporte SMTP constituye un detalle de infraestructura y nunca deberá afectar a la lógica de negocio.

El resto de la aplicación no podrá depender directa ni indirectamente de librerías específicas de envío de correo.

---

# Restricciones Arquitectónicas

No estará permitido:

* Crear servicios específicos para un proveedor SMTP.
* Acoplar la lógica de negocio a una implementación concreta del transporte.
* Instanciar transportes SMTP desde Controllers.
* Instanciar transportes SMTP desde Services de negocio.
* Crear múltiples implementaciones del servicio de correo sin una necesidad arquitectónica justificada.
* Duplicar lógica de envío.
* Introducir dependencias circulares.
* Hardcodear parámetros de infraestructura.
* Crear configuraciones distintas para cada proveedor SMTP.

El único componente autorizado para interactuar con la infraestructura de correo será `EmailService`.

---

# Objetivos Funcionales

El subsistema deberá implementar un único servicio de correo reutilizable para toda la plataforma.

Todas las funcionalidades del SaaS deberán utilizar exclusivamente este servicio para cualquier comunicación por correo electrónico.

El sistema deberá garantizar:

* Un único punto de entrada para el envío de emails.
* Un único transporte SMTP reutilizable.
* Configuración completamente externa.
* Reutilización de conexiones SMTP.
* Compatibilidad con múltiples entornos de ejecución.
* Compatibilidad con múltiples servidores SMTP.
* Ausencia de duplicación de lógica.
* Bajo acoplamiento entre módulos.
* Alta cohesión funcional.

La incorporación de nuevas funcionalidades nunca deberá requerir modificaciones estructurales del subsistema de correo.

---

# Flujo Arquitectónico Obligatorio

El envío de correos electrónicos nunca podrá ejecutarse directamente desde un Controller ni bloquear una petición HTTP.

Todo correo electrónico deberá seguir obligatoriamente el siguiente flujo:

```
HTTP Request
        │
        ▼
Controller
        │
        ▼
Application Service
        │
        ▼
BullMQ Queue
        │
        ▼
Worker
        │
        ▼
EmailService
        │
        ▼
SMTP Transport
        │
        ▼
Servidor SMTP
```

La cola de procesamiento deberá desacoplar completamente la lógica de negocio del envío físico del correo electrónico.

Esta arquitectura permitirá:

* Procesamiento asíncrono.
* Reintentos automáticos.
* Escalabilidad horizontal.
* Distribución de carga.
* Alta disponibilidad.
* Tolerancia a fallos.
* Observabilidad completa.
* Sustitución transparente del servidor SMTP sin modificar la lógica de negocio.


---
# Configuración del Subsistema

Toda la configuración del subsistema de correo electrónico deberá realizarse exclusivamente mediante mecanismos externos de configuración.

No se permitirá almacenar parámetros de infraestructura dentro del código fuente.

Toda configuración deberá obtenerse desde variables de entorno o desde un sistema de gestión de secretos compatible con el entorno de despliegue.

Como mínimo deberán existir parámetros para configurar:

* Host SMTP
* Puerto SMTP
* Tipo de conexión
* Usuario
* Contraseña
* Dirección remitente
* Nombre remitente
* Dirección Reply-To
* Tiempo de espera
* Número máximo de conexiones
* Reutilización de conexiones
* Número máximo de reintentos
* Nivel de logging

No estará permitido:

* Valores hardcodeados.
* Credenciales embebidas.
* Direcciones de correo fijas.
* Configuración distinta por módulo.

Toda la aplicación deberá utilizar una única configuración centralizada.

---

# Compatibilidad entre Entornos

La arquitectura deberá funcionar de forma idéntica en todos los entornos de ejecución.

La única diferencia entre entornos será la configuración externa.

No estará permitido modificar:

* Código fuente.
* Servicios.
* Controladores.
* DTOs.
* Entidades.
* Repositorios.
* Workers.
* Componentes del frontend.

El cambio de entorno deberá realizarse únicamente modificando variables de entorno.

La arquitectura deberá soportar, sin modificaciones del código:

* Desarrollo local.
* Integración continua.
* Testing.
* Staging.
* Producción.

Durante el desarrollo local podrá utilizarse cualquier servidor SMTP de pruebas compatible.

En producción podrá utilizarse cualquier servidor SMTP estándar compatible.

La aplicación nunca deberá depender de un proveedor específico.

---

# Arquitectura Multi-Tenant

El subsistema deberá respetar completamente el aislamiento entre restaurantes.

Cada restaurante podrá disponer de su propia configuración de correo electrónico, incluyendo:

* Nombre del remitente.
* Dirección del remitente.
* Dirección Reply-To.
* Firma corporativa.
* Logotipo.
* Idioma por defecto.
* Zona horaria.
* Plantillas personalizadas.
* Configuración SMTP (si la arquitectura futura lo permite).

El frontend nunca enviará identificadores de restaurante.

Toda resolución del restaurante deberá realizarse exclusivamente en el backend mediante el sistema de aislamiento Multi-Tenant existente.

Toda operación deberá ejecutarse utilizando el `restaurantId` resuelto por el TenantInterceptor.

---

# Sistema de Plantillas

Todo el contenido HTML deberá estar completamente desacoplado del código TypeScript.

Las plantillas deberán implementarse mediante Handlebars.

Cada plantilla constituirá una unidad independiente y reutilizable.

La arquitectura deberá facilitar la incorporación de nuevas plantillas sin modificar el núcleo del sistema.

Ejemplos de plantillas:

* Confirmación de reserva.
* Modificación de reserva.
* Cancelación de reserva.
* Recordatorio.
* Recuperación de contraseña.
* Bienvenida.
* Invitación de personal.
* Alta de restaurante.
* Verificación de cuenta.
* Notificaciones internas.
* Facturación.
* Comunicaciones futuras.

Todas las plantillas deberán soportar internacionalización.

El idioma se resolverá dinámicamente utilizando la configuración del restaurante y del usuario.

---

# Procesamiento Asíncrono

Todo envío de correo electrónico deberá ejecutarse mediante BullMQ.

No estará permitido realizar envíos síncronos desde peticiones HTTP.

Cada trabajo deberá contener toda la información necesaria para reconstruir completamente el envío.

Como mínimo:

* tenantId
* restaurantId
* plantilla
* idioma
* destinatarios
* datos dinámicos
* prioridad
* fecha programada
* identificador de trazabilidad
* número de reintentos

La cola deberá implementar:

* Reintentos automáticos.
* Backoff exponencial.
* Gestión de errores.
* Persistencia.
* Idempotencia.
* Recuperación ante reinicios.

Ningún correo deberá perderse debido a reinicios del sistema.

---

# Observabilidad

El subsistema deberá proporcionar trazabilidad completa de todas las operaciones.

Cada envío deberá registrar como mínimo:

* Fecha.
* Hora.
* Restaurante.
* Tenant.
* Plantilla utilizada.
* Destinatario.
* Estado.
* Duración.
* Número de intentos.
* Error producido (si existe).

La arquitectura deberá facilitar la incorporación de métricas para:

* Correos enviados.
* Correos fallidos.
* Latencia media.
* Tiempo de procesamiento.
* Reintentos.
* Saturación de la cola.
* Disponibilidad del servicio.

---

# Seguridad

La implementación deberá cumplir el principio de mínimo privilegio.

Nunca se registrarán en logs:

* Contraseñas.
* Tokens.
* Credenciales SMTP.
* Información sensible.
* Contenido confidencial.

Las credenciales deberán obtenerse exclusivamente mediante variables de entorno o sistemas de gestión de secretos.

Nunca deberán almacenarse secretos dentro del repositorio.

Toda información registrada deberá ser previamente sanitizada.

---

# Responsabilidades del Frontend

El frontend nunca interactuará directamente con la infraestructura SMTP.

Angular únicamente solicitará operaciones funcionales como:

* Enviar correo.
* Reenviar correo.
* Vista previa.
* Validar plantilla.
* Programar envío.

Todo el procesamiento del correo electrónico deberá ejecutarse exclusivamente en el backend.

---

# Persistencia

Antes de implementar nuevas entidades será obligatorio auditar el modelo Prisma existente.

Solo se crearán nuevas entidades cuando exista una necesidad funcional demostrable.

Posibles entidades futuras:

* EmailTemplate
* EmailLog
* RestaurantEmailSettings
* EmailAttachment
* EmailAudit

No se permitirá duplicación de información.

Toda la persistencia deberá mantener consistencia transaccional con el resto del dominio.

---

# Evolución de la Arquitectura

El subsistema deberá permanecer completamente independiente de la infraestructura de envío.

Será posible sustituir el servidor SMTP por cualquier implementación compatible sin modificar:

* La lógica de negocio.
* Los módulos de NestJS.
* Los Controllers.
* Los Services.
* Los DTOs.
* Las entidades Prisma.
* El frontend.

El único cambio permitido será la actualización de la configuración externa.

---

# Rendimiento

La arquitectura deberá optimizar el uso de recursos.

Como mínimo deberá implementar:

* Reutilización de conexiones SMTP.
* Pool de conexiones.
* Procesamiento asíncrono.
* Gestión eficiente de memoria.
* Reducción de operaciones redundantes.

La solución deberá estar preparada para soportar cargas crecientes sin degradación significativa del rendimiento.

---

# Escalabilidad

La arquitectura deberá permitir crecer progresivamente sin modificaciones estructurales.

El diseño deberá contemplar escenarios desde decenas hasta miles de restaurantes y un volumen elevado de comunicaciones diarias.

Toda ampliación futura deberá realizarse mediante escalado horizontal de la infraestructura y nunca mediante refactorización del subsistema.

---

# Experiencia de Usuario

Todas las interfaces de administración relacionadas con el correo electrónico deberán ser completamente responsive.

La experiencia de uso deberá mantenerse consistente en:

* Teléfonos móviles.
* Tablets.
* Portátiles.
* Equipos de escritorio.

No se desarrollarán interfaces independientes para cada dispositivo.

---

# Flujo Obligatorio de Implementación

Antes de escribir cualquier línea de código será obligatorio realizar una auditoría completa de:

1. Arquitectura actual.
2. Modelo Prisma.
3. Módulos existentes.
4. Sistema BullMQ.
5. Variables de entorno.
6. Configuración SMTP.
7. Plantillas.
8. Integración Multi-Tenant.
9. Contratos API.
10. Dependencias existentes.

Únicamente después de la auditoría podrán implementarse cambios.

Toda modificación deberá ser mínima, incremental y compatible con el resto de la plataforma.

No se permitirá introducir duplicación, deuda técnica ni inconsistencias arquitectónicas.

---

# Validación Obligatoria

Cada iteración de desarrollo deberá finalizar ejecutando obligatoriamente:

```bash
pnpm --filter api exec tsc --noEmit --skipLibCheck
pnpm build
git status
```

La implementación únicamente se considerará finalizada cuando:

* Todo el proyecto compile sin errores.
* No existan inconsistencias entre Angular, NestJS, Prisma y PostgreSQL.
* No se introduzca deuda técnica.
* Se mantenga el aislamiento Multi-Tenant.
* La arquitectura continúe siendo completamente independiente del servidor SMTP utilizado.
* El cambio de un servidor SMTP a ot
* ro pueda realizarse exclusivamente modificando la configuración externa, sin refactorizar el backend, el frontend ni la lógica de negocio.
