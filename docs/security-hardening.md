# Security Hardening Specification – Whatboo SaaS Multi-Tenant

# Objetivo

Diseñar e implementar el subsistema de seguridad de Whatboo siguiendo estándares Enterprise para aplicaciones SaaS Multi-Tenant, garantizando confidencialidad, integridad, disponibilidad, trazabilidad y resiliencia sin introducir deuda técnica ni refactorizaciones futuras.

La implementación deberá integrarse completamente con la arquitectura existente basada en Angular 19, NestJS, Prisma 7, PostgreSQL, Redis, BullMQ y Nginx.

Toda mejora deberá mantener la compatibilidad entre frontend, backend, base de datos y contratos API.

No se permitirá introducir inconsistencias entre capas ni romper funcionalidades existentes.

Actúa como un desarrollador experto. Al generar o modificar el modelo AuditLog en la base de datos, debes aplicar estrictamente las mejores y más profesionales reglas críticas de arquitectura para evitar fallas de seguridad y aislamiento de datos:

- Tipado de datos: Verificar si al utilizar Json para los campos previousValue y newValue no es lo más correcto. También debes verificar si es necesario definir el tipo de datos manualmente, asegurando que se adapte correctamente a la estructura del sistema y a las reglas de auditoría.
- Aislamiento de datos (Multi-tenancy): En la tabla AuditLog, verificar si es necesarios especificar de forma explícita y relacional el campo tenantId junto con su clave foránea. También si es necesarios incluir los índices correspondientes (@index o la asignación adecuada) para garantizar el aislamiento estricto de los datos entre diferentes tenants y si esto es la mejor práctica y lo más correcto.

El resultado deberá compilar con cero errores y quedar preparado para escalar desde decenas hasta miles de restaurantes.

---

# Objetivos Arquitectónicos

Toda implementación deberá cumplir obligatoriamente los siguientes principios:

* Security by Design.
* Zero Trust Architecture.
* Principle of Least Privilege.
* Defense in Depth.
* Secure Defaults.
* Complete Auditability.
* Externalized Configuration.
* Cloud Native.
* Stateless Services.
* Multi-Tenant Isolation.
* High Availability.
* High Performance.
* Horizontal Scalability.
* Backward Compatibility.
* Future Proof Architecture.

No se permitirá implementar soluciones temporales o acopladas.

---

# Stack Tecnológico

La implementación deberá respetar la arquitectura existente.

Frontend
* Angular 19

Backend
* NestJS

ORM
* Prisma 7

Base de Datos
* PostgreSQL

Cache y Colas
* Redis
* BullMQ

Reverse Proxy
* Nginx

Autenticación
* JWT
* Guards
* TenantInterceptor

---

# Alcance

La implementación comprenderá obligatoriamente los siguientes bloques:

1. Gestión y rotación de secretos.
2. Políticas de contraseñas.
3. Contraseñas temporales y expiración.
4. Auditoría administrativa.
5. Rate Limiting avanzado.
6. Hardening HTTP.
7. Seguridad Nginx.
8. Observabilidad.
9. Validación final.

---

# Gestión de Secretos

Toda credencial deberá obtenerse exclusivamente desde variables de entorno o gestores de secretos.

Nunca almacenar secretos en:

* Git
* Prisma
* Angular
* TypeScript
* Dockerfile
* Imágenes Docker

La arquitectura deberá permitir la rotación transparente de:

* JWT Secret
* Refresh Secret
* SMTP Credentials
* API Keys
* OAuth Secrets
* WhatsApp Tokens
* Database Credentials
* Redis Credentials

La rotación no deberá requerir modificaciones del código.

Actúa como un ingeniero de software principal (Principal Engineer) experto en seguridad. Siempre verificar primero, si es la mejor opcón y más profesional y si no esta implementado, y si lo es diseña un mecanismo de rotación criptográfica activa para los secretos de JWT en una plataforma SaaS. El objetivo crítico es lograr una rotación transparente y sin tiempos de inactividad (Zero-Downtime) para evitar la invalidación masiva y simultánea de todas las sesiones activas de los usuarios.Aplica las siguientes directrices para el diseño:

- Requisito Operativo: Siempre verificar si es la mejor opcón y más profesional y si no esta implementado, y si lo es decidir si el sistema debe ser capaz de actualizar o rotar las claves de firmado de los tokens JWT de manera dinámica, sin requerir el reinicio de los contenedores o servicios de la aplicación.
- Estrategia de Implementación (Recomendación de arquitectura): Siempre verificar si es la mejor opcón y más profesional y si no esta implementado, y si lo es entonces gestionar las claves activas, se sugiere fuertemente leer dinámicamente las claves públicas/privadas desde un almacén de secretos centralizado (como AWS Secrets Manager o HashiCorp Vault) utilizando un sistema de firmas asimétricas. También siempre verificar si es la mejor opcón y más profesional y si no esta implementado, aunque no es obligatorio (también podrías almacenar un puntero de versión de clave en Redis), la lectura dinámica desde un almacén dedicado se considera la mejor práctica de la industria y la solución más profesional para garantizar la máxima seguridad y auditoría.

---

# Política de Contraseñas

Implementar una política configurable.

Como mínimo:

* Longitud mínima configurable.
* Longitud máxima configurable.
* Letras mayúsculas.
* Letras minúsculas.
* Números.
* Caracteres especiales.
* Historial de contraseñas.
* Impedir reutilización.
* Validación contra contraseñas débiles.
* Hash mediante algoritmo resistente (Argon2id preferentemente; bcrypt únicamente por compatibilidad existente).

Nunca almacenar contraseñas en texto plano.

---

# Contraseñas Temporales

Todo usuario creado por un administrador deberá recibir una contraseña temporal.

La contraseña temporal deberá:

* Expirar automáticamente.
* Obligar al cambio en el primer acceso.
* Tener fecha de expiración.
* Invalidarse tras el cambio.
* Ser imposible reutilizarla.

El backend controlará completamente este flujo.
Angular únicamente mostrará el estado.

---

# Auditoría Administrativa

Toda acción administrativa deberá registrarse.

Como mínimo:

* Usuario.
* Rol.
* Tenant.
* Restaurante.
* Acción.
* Entidad.
* Identificador.
* Valores anteriores.
* Valores nuevos.
* Fecha.
* Hora.
* Dirección IP.
* User-Agent.
* Resultado.
* Duración.

Registrar operaciones como:

* Login.
* Logout.
* Cambio de contraseña.
* Creación de usuarios.
* Eliminación.
* Cambios de permisos.
* Configuración WhatsApp.
* Configuración SMTP.
* Cambios del restaurante.
* Reservas modificadas manualmente.
* Exportaciones.
* Importaciones.

La auditoría deberá ser inmutable.

Nunca modificar registros históricos.

---

# Rate Limiting

Actúa como un arquitecto de software experto en NestJS. Diseña la estrategia de limitación de tasa de peticiones (Rate Limiting) para una plataforma SaaS multi-tenant, primero verificando si la mejor opcón y más profesional y si no esta implementado sea modificar el comportamiento predeterminado del paquete @nestjs/throttler (el cual rastrea por IP) bajo los siguientes criterios:

- Límite en el Dashboard Administrativo: siempre verificar si es la mejor opcón y más profesional y si no esta implementado, entonces implementar un rastreo personalizado que calcule el límite combinando TenantId + UserId, en lugar de usar la dirección IP del usuario.
- Límite en Webhooks (Recomendación de seguridad): siempre verificar si es la mejor opcón y más profesional y si no esta implementado, verifica que en lugar de limitar por IP, se sugiere fuertemente configurar el rate limiting basándose en la verificación de la firma criptográfica de WhatsApp (X-Hub-Signature-256). Aunque no es una restricción técnica obligatoria, se considera la mejor práctica y la solución más profesional para garantizar la autenticidad del emisor y proteger el endpoint de ataques de denegación de servicio.

Implementar políticas independientes según el tipo de endpoint.

Dashboard administrativo

* Límites moderados.
* Protección contra fuerza bruta.
* Protección frente a scraping.
* Protección de autenticación.

API pública

* Límites configurables por tenant.

Webhook WhatsApp

* Rate limit específico.
* Exclusión de falsos positivos.
* Validación de firma.
* Protección frente a abuso.

Autenticación

* Límites muy restrictivos.
* Backoff progresivo.
* Bloqueo temporal configurable.

Nunca utilizar una política única para toda la aplicación.

---

# Seguridad HTTP

Implementar una política completa de cabeceras HTTP.

Como mínimo:

* Content Security Policy.
* Strict Transport Security.
* X-Frame-Options.
* X-Content-Type-Options.
* Referrer Policy.
* Permissions Policy.
* Cross-Origin Resource Policy.
* Cross-Origin Opener Policy.
* Cross-Origin Embedder Policy.

Eliminar cabeceras innecesarias.
Ocultar información del servidor.

---

# Hardening de Nginx

Reforzar completamente la configuración del Reverse Proxy.

Implementar:

* TLS moderno.
* HTTP/2 o HTTP/3 cuando sea posible.
* Redirección HTTPS.
* Security Headers.
* CSP estricta.
* Rate Limiting.
* Limitación de tamaño de peticiones.
* Timeouts.
* Protección Slowloris.
* Compresión segura.
* Caché cuando corresponda.
* Proxy seguro.
* Eliminación de información del servidor.

Toda configuración deberá ser compatible con despliegues Cloud Native.

### SEGURIDAD HTTP Y REVERSE PROXY (Nginx)

Siempre verificar si es la mejor opcón y más profesional y si no esta implementado, generar la configuración declarativa para el bloque del servidor de Nginx implementando la mitigación contra ataques de denegación de servicio en la capa de red:

```nginx
# Hardening de Cabeceras en Proxy Pass
proxy_hide_header X-Powered-By;
proxy_hide_header Server;

add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://whatboo.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), camera=(), microphone=()" always;

# Protecciones de Capacidad
client_max_body_size 10M;
client_body_buffer_size 128k;
client_header_timeout 12s;
client_body_timeout 12s;
keepalive_timeout 65s;
send_timeout 10s;
```

---

# Multi-Tenant

Toda medida de seguridad deberá respetar completamente el aislamiento entre restaurantes.

Nunca compartir:

* Secretos.
* Tokens.
* Auditorías.
* Configuración.
* Logs sensibles.

Toda resolución de restaurantId deberá permanecer exclusivamente en backend.

---

# Observabilidad

Registrar métricas de seguridad.

Como mínimo:

* Intentos de login.
* Bloqueos.
* Rate Limits activados.
* Cambios de contraseña.
* Rotación de secretos.
* Acciones administrativas.
* Errores de autenticación.
* Errores JWT.
* Errores CSP.

Preparar integración futura con sistemas de monitorización y alertado.


---

# Base de Datos

Auditar el modelo Prisma existente.

Solo crear nuevas entidades cuando sean estrictamente necesarias.

Posibles entidades:

* AuditLog
* PasswordHistory
* SecretRotation
* LoginAttempt
* SecurityEvent

No duplicar información.

Mantener consistencia transaccional.

---

# Frontend

Angular nunca tomará decisiones de seguridad.
Toda validación crítica deberá ejecutarse en NestJS.
El frontend únicamente consumirá APIs seguras y mostrará estados al usuario.
Todas las pantallas administrativas deberán ser completamente responsive y mantener una experiencia homogénea en móvil, tablet y escritorio.

---

# Flujo Obligatorio de Implementación

Antes de escribir código:

1. Auditar arquitectura actual.
2. Auditar autenticación.
3. Auditar Prisma.
4. Auditar JWT.
5. Auditar Nginx.
6. Auditar Redis.
7. Auditar BullMQ.
8. Auditar variables de entorno.
9. Auditar Guards.
10. Auditar interceptores.

Después:

Implementar únicamente cambios mínimos.
No romper funcionalidades existentes.
No duplicar lógica.
No introducir deuda técnica.
Mantener compatibilidad completa entre Angular, NestJS, Prisma y PostgreSQL.

---

# Validación Obligatoria

Toda iteración deberá finalizar ejecutando obligatoriamente:

```bash
pnpm --filter api exec tsc --noEmit --skipLibCheck
pnpm build
git status
```

La implementación únicamente se considerará finalizada cuando:

* Todo el proyecto compile sin errores.
* No existan inconsistencias entre frontend, backend y base de datos.
* Todas las políticas de seguridad sean configurables.
* El sistema permanezca completamente Multi-Tenant.
* No exista acoplamiento entre la lógica de negocio y la infraestructura.
* La arquitectura continúe siendo escalable, observable, resiliente y preparada para producción sin necesidad de futuras refactorizaciones.
