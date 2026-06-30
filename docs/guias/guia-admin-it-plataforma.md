# Guía para Admin o técnico IT: administración y soporte de la plataforma

Esta guía está pensada para el usuario Admin o para el técnico IT que da soporte a la plataforma. Su función no es atender mesas ni gestionar el servicio diario del restaurante, sino asegurar que la plataforma esté disponible, que cada restaurante tenga su información correcta y que las incidencias se revisen con orden.

El Admin o técnico IT puede tener acceso a información global de la plataforma. Por eso debe actuar con especial cuidado: un cambio puede afectar a un restaurante completo o a varios usuarios.

Fecha de la guía: 2026-06-30

## 1. Qué hace un Admin o técnico IT

Como Admin o técnico IT, normalmente te ocuparás de:

- Revisar el estado general de la plataforma.
- Consultar restaurantes registrados.
- Activar, suspender o revisar restaurantes.
- Revisar datos generales de cada restaurante.
- Revisar información de billing.
- Comprobar si un restaurante tiene WhatsApp conectado.
- Consultar usuarios de plataforma.
- Revisar el estado del sistema.
- Revisar eventos recientes.
- Ayudar al Owner o Manager cuando algo no funciona.

Tu objetivo principal es mantener la plataforma estable y ayudar sin interferir en la operación diaria del restaurante.

## 2. Diferencia entre Admin, Owner, Manager y Staff

| Usuario | Responsabilidad principal |
| --- | --- |
| Admin / técnico IT | Soporte global, estado de plataforma, restaurantes, billing y revisión de incidencias |
| Owner | Configuración principal del restaurante y decisiones del negocio |
| Manager | Operación diaria, equipo, mesas, horarios y reportes del restaurante |
| Staff | Atención diaria de reservas, clientes, llegadas, cancelaciones y no-show |

El Admin no debe hacer tareas operativas de sala salvo que sea necesario para soporte. Tampoco debe cambiar datos sensibles de un restaurante sin autorización del Owner o del responsable correspondiente.

## 3. Entrar al panel de administración

1. Abre el panel de WhatBoo.
2. Inicia sesión con tu usuario Admin.
3. En el menú lateral, entra en `Platform Admin` o `Administración de la plataforma`.
4. Revisa que estés en la pantalla correcta antes de modificar datos.

Buenas prácticas:

- Usa siempre tu propia cuenta.
- No compartas tu usuario ni tu contraseña.
- No dejes la sesión abierta en equipos compartidos.
- Si vas a hacer cambios importantes, deja constancia interna según el procedimiento de tu equipo.

## 4. Pantalla principal de Administración de la plataforma

En esta pantalla verás una visión global del sistema.

Los bloques principales son:

- Métricas globales.
- Listado de restaurantes.
- Detalle del restaurante seleccionado.
- Billing.
- Usuarios de plataforma.
- Estado del sistema.
- Últimos eventos.

Utiliza esta pantalla para diagnóstico y soporte. No la uses para hacer cambios por curiosidad.

## 5. Métricas globales

En la parte superior verás indicadores como:

- Total de restaurantes.
- Restaurantes activos.
- Restaurantes suspendidos.
- Billing activo.
- Billing con problemas.
- Reservas totales.

Cómo usar estas métricas:

- Si aumentan los suspendidos, revisa si hubo incidencias de pago o soporte.
- Si hay muchos restaurantes con billing pendiente, revisa el flujo de cobro.
- Si las reservas bajan de forma inesperada, puede haber un problema operativo o de integración.
- Si las métricas no cargan, revisa el estado del sistema.

## 6. Listado de restaurantes

En el bloque `Restaurantes` puedes ver los restaurantes registrados.

Normalmente se muestra:

- Nombre del restaurante.
- Identificador o slug.
- Ciudad.
- Estado.
- Plan y estado de billing.
- Número de usuarios.
- Número de reservas.
- Número de mesas.

Puedes usar el buscador para localizar un restaurante por nombre o identificador.

También puedes filtrar por estado:

- Todos.
- Activos.
- Inactivos.
- Suspendidos.

## 7. Estados de un restaurante

Los estados habituales son:

| Estado | Significado |
| --- | --- |
| ACTIVE | El restaurante está activo y puede operar |
| INACTIVE | El restaurante no está activo o no está listo |
| SUSPENDED | El restaurante está suspendido y puede tener restricciones |

Antes de cambiar el estado:

1. Confirma qué restaurante estás editando.
2. Revisa el motivo del cambio.
3. Comprueba si hay una incidencia, impago o solicitud del Owner.
4. Evita suspender un restaurante durante el servicio salvo que sea necesario.
5. Informa al Owner o al equipo responsable.

## 8. Ver detalle de un restaurante

Para revisar un restaurante:

1. Busca el restaurante en la lista.
2. Pulsa `Ver`.
3. Revisa el panel `Detalle del restaurante`.

En el detalle puedes encontrar:

- Nombre.
- Nombre legal.
- Email.
- Teléfono.
- Ciudad.
- País.
- Zona horaria.
- Estado.

Revisa estos datos cuando:

- El restaurante no aparece correctamente.
- El Owner informa datos incorrectos.
- Hay problemas con zona horaria.
- Hay dudas de facturación.
- Hay una incidencia de acceso o tenant.

## 9. Editar datos básicos del restaurante

Puedes editar datos básicos como nombre, email, teléfono, ciudad, país o zona horaria.

Antes de guardar:

1. Confirma la solicitud con el Owner o responsable autorizado.
2. Revisa que el cambio no sea un error de escritura.
3. Comprueba especialmente la zona horaria.
4. Pulsa `Guardar`.
5. Pide al restaurante que revise si el cambio se ve correctamente.

Importante:

La zona horaria afecta a horarios, reservas y reportes. No la cambies sin estar seguro.

## 10. Activar o suspender restaurantes

En el detalle del restaurante puedes usar acciones como:

- `Activar`.
- `Suspender`.
- `Guardar`.

Usa `Activar` cuando:

- El restaurante ya puede operar.
- Se resolvió una incidencia.
- Se regularizó el billing.
- El Owner pidió reactivar el servicio.

Usa `Suspender` solo cuando:

- Hay una razón clara.
- Existe una incidencia grave.
- El billing lo requiere.
- El Owner o el equipo responsable lo aprobó.

Nunca suspendas un restaurante sin revisar primero el impacto.

## 11. Billing

El bloque `Billing` permite revisar o ajustar datos comerciales.

Campos habituales:

- Plan.
- Estado de billing.
- Email de billing.
- Referencia de cliente.
- Fin de trial.
- Fin del período actual.

## 12. Planes de billing

Los planes pueden ser:

| Plan | Uso habitual |
| --- | --- |
| FREE | Prueba, demo o cuenta sin cobro |
| STARTER | Plan inicial |
| PRO | Plan profesional |
| ENTERPRISE | Plan avanzado o personalizado |

Antes de cambiar un plan:

1. Confirma que existe una solicitud comercial válida.
2. Revisa si el cambio afecta límites o soporte.
3. Comprueba el email de billing.
4. Guarda el cambio.
5. Informa al equipo comercial o responsable.

## 13. Estados de billing

Los estados pueden ser:

| Estado billing | Significado |
| --- | --- |
| TRIAL | El restaurante está en período de prueba |
| ACTIVE | El billing está activo |
| PAST_DUE | Hay un pago pendiente o problema de cobro |
| SUSPENDED | El servicio está suspendido por billing u otra razón |
| CANCELLED | La cuenta fue cancelada |

Cuando veas `PAST_DUE`:

1. No suspendas automáticamente sin revisar la política interna.
2. Comprueba la fecha del período actual.
3. Revisa si hay comunicación previa con el cliente.
4. Escala al equipo responsable de billing.

## 14. WhatsApp de un restaurante

En la sección de detalle puede aparecer cuántas cuentas de WhatsApp tiene asociadas un restaurante.

Como Admin o técnico IT, revisa:

- Si el restaurante tiene una cuenta de WhatsApp configurada.
- Si el Owner completó la configuración inicial.
- Si las reservas por WhatsApp están llegando.
- Si hubo cambios recientes en Meta o en el número.

No cambies tokens, claves ni datos de Meta sin autorización.

Si WhatsApp no funciona:

1. Pregunta al restaurante qué ocurre exactamente.
2. Confirma si los clientes escriben al número correcto.
3. Revisa si el restaurante aparece activo.
4. Revisa si hay cuenta de WhatsApp asociada.
5. Revisa el estado del sistema.
6. Consulta últimos eventos.
7. Escala si hay que revisar credenciales o proveedor externo.

## 15. Usuarios de plataforma

En `Usuarios de plataforma` puedes ver usuarios con roles globales o administrativos.

Normalmente se muestra:

- Email.
- Rol.
- Restaurante asociado.

Buenas prácticas:

- Revisa periódicamente quién tiene acceso administrativo.
- No crees accesos globales sin autorización.
- Retira o suspende accesos cuando una persona deje el equipo.
- Usa el mínimo permiso necesario para cada persona.

## 16. Estado del sistema

En `Estado del sistema` puedes ver componentes como:

- API.
- DB.
- Redis.

Interpretación sencilla:

| Componente | Qué significa |
| --- | --- |
| API | Servicio principal que responde al panel y a WhatsApp |
| DB | Base de datos donde se guardan restaurantes, usuarios, reservas y clientes |
| Redis | Servicio auxiliar para colas, tareas y soporte de operación |

Si todo está correcto, deberían aparecer como disponibles o saludables.

Si algo aparece como caído o desconocido:

1. No hagas cambios de datos todavía.
2. Revisa si el problema afecta a todos los restaurantes o solo a uno.
3. Consulta últimos eventos.
4. Comprueba si hay una incidencia de infraestructura.
5. Escala al equipo técnico responsable.

## 17. Últimos eventos

El bloque `Últimos eventos` ayuda a entender incidencias recientes.

Puede mostrar:

- Motivo del evento.
- Fecha y hora.
- Mensaje de error.

Cómo usarlo:

- Revisa eventos cuando un restaurante reporte un problema.
- Busca eventos repetidos.
- Compara la hora del evento con la hora del problema reportado.
- Guarda la información si tienes que escalar.

No compartas mensajes internos de error con clientes finales sin revisarlos antes.

## 18. Procedimiento ante una incidencia

Cuando alguien reporte un problema:

1. Pregunta qué restaurante está afectado.
2. Pregunta qué usuario tuvo el problema.
3. Pregunta qué estaba intentando hacer.
4. Pregunta desde cuándo ocurre.
5. Revisa si afecta a un solo restaurante o a varios.
6. Entra en `Administración de la plataforma`.
7. Busca el restaurante.
8. Revisa estado, billing, WhatsApp y eventos.
9. Revisa el estado del sistema.
10. Decide si puedes resolverlo o si debes escalar.

## 19. Información mínima para escalar soporte

Cuando escales una incidencia, recopila:

- Nombre del restaurante.
- Email del usuario afectado.
- Hora aproximada del problema.
- Pantalla donde ocurrió.
- Acción que intentaba hacer.
- Mensaje de error si existe.
- Si afecta a un usuario o a varios.
- Si afecta a un restaurante o a varios.
- Captura de pantalla si no contiene datos sensibles.

Cuanto más clara sea la información, más rápido se resolverá la incidencia.

## 20. Casos frecuentes

### Un restaurante no puede entrar

1. Revisa si el restaurante está activo.
2. Revisa si el usuario pertenece al restaurante correcto.
3. Comprueba si el usuario está activo.
4. Pide al usuario que intente restablecer contraseña si corresponde.
5. Escala si el problema continúa.

### Un restaurante no recibe reservas de WhatsApp

1. Revisa si el restaurante está activo.
2. Revisa si tiene cuenta de WhatsApp asociada.
3. Pregunta si hubo cambios en Meta o en el número.
4. Revisa eventos recientes.
5. Escala si puede ser un problema de integración.

### Las horas de reserva aparecen incorrectas

1. Revisa la zona horaria del restaurante.
2. Pregunta al Owner cuál es la zona horaria correcta.
3. Corrige solo si está confirmado.
4. Pide al Manager que revise horarios y reservas.

### El restaurante aparece suspendido

1. Revisa el estado del restaurante.
2. Revisa estado de billing.
3. Comprueba si hay una razón documentada.
4. No actives sin autorización si la suspensión fue por billing o seguridad.

### Hay problemas de billing

1. Revisa plan y estado.
2. Revisa email de billing.
3. Revisa fin de trial y fin del período actual.
4. Escala al equipo comercial o financiero si corresponde.

## 21. Seguridad y privacidad

Como Admin o técnico IT puedes ver información sensible.

Reglas básicas:

- No compartas datos de clientes fuera de canales autorizados.
- No descargues información si no es necesario.
- No compartas tokens, claves o contraseñas.
- No envíes capturas con datos sensibles por canales abiertos.
- No cambies datos de restaurantes sin motivo claro.
- No uses cuentas compartidas.
- Cierra sesión en equipos compartidos.

## 22. Qué no deberías hacer

Evita:

- Cambiar datos de billing sin autorización.
- Suspender restaurantes sin motivo confirmado.
- Modificar zona horaria sin validación.
- Tocar credenciales de WhatsApp sin permiso del Owner.
- Usar el panel de un restaurante para hacer pruebas sin avisar.
- Crear usuarios administrativos innecesarios.
- Ignorar eventos repetidos.
- Resolver incidencias críticas sin dejar constancia.

## 23. Checklist diario del Admin o técnico IT

- [ ] Revisé métricas globales.
- [ ] Revisé si hay restaurantes suspendidos inesperadamente.
- [ ] Revisé estados de billing críticos.
- [ ] Revisé estado del sistema.
- [ ] Revisé eventos recientes relevantes.
- [ ] Atendí incidencias pendientes.
- [ ] Escalé incidencias que requieren intervención técnica o comercial.

## 24. Checklist semanal

- [ ] Revisé usuarios administrativos.
- [ ] Revisé restaurantes en trial o past due.
- [ ] Revisé restaurantes suspendidos.
- [ ] Revisé incidencias repetidas.
- [ ] Confirmé que no haya accesos innecesarios.
- [ ] Revisé si hay restaurantes con WhatsApp sin configurar.
- [ ] Compartí hallazgos importantes con el equipo responsable.

## 25. Checklist antes de tocar un restaurante

- [ ] Confirmé el restaurante correcto.
- [ ] Confirmé quién solicita el cambio.
- [ ] Confirmé que la persona tiene autorización.
- [ ] Revisé el impacto del cambio.
- [ ] Evité cambiar datos sensibles si no era necesario.
- [ ] Guardé o comuniqué el resultado del cambio.

## 26. Ejemplos de respuestas internas

Cuando necesitas pedir más información:

```text
Necesito el nombre del restaurante, el usuario afectado, la hora aproximada y qué acción estaba intentando hacer.
```

Cuando el problema parece de WhatsApp:

```text
Voy a revisar si el restaurante está activo, si tiene WhatsApp asociado y si hay eventos recientes. Si las credenciales de Meta requieren revisión, lo escalaremos al responsable autorizado.
```

Cuando el problema parece de billing:

```text
El restaurante aparece con estado de billing pendiente. Lo revisaré con el equipo responsable antes de cambiar el estado del servicio.
```

Cuando hay un problema general:

```text
El estado del sistema muestra una incidencia. Voy a recopilar la información y escalarla al equipo técnico para revisión.
```

## 27. Resumen rápido

Como Admin o técnico IT, tu prioridad es mantener la plataforma estable y ayudar a los restaurantes sin modificar datos innecesariamente.

El orden recomendado ante cualquier revisión es:

1. Identificar restaurante y usuario.
2. Revisar estado del restaurante.
3. Revisar billing si aplica.
4. Revisar WhatsApp si el problema es de reservas o mensajes.
5. Revisar estado del sistema.
6. Revisar últimos eventos.
7. Resolver si es seguro.
8. Escalar si requiere autorización, proveedor externo o intervención técnica profunda.

Un buen Admin no toca más de lo necesario: observa, confirma, actúa con cuidado y deja trazabilidad.
