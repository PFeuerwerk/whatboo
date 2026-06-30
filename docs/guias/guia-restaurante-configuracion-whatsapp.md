# Guia para configurar WhatsApp y el panel del restaurante

Esta guia esta pensada para el dueño o responsable del restaurante. No necesitas conocimientos tecnicos. La idea es que puedas preparar tu numero oficial de WhatsApp, copiar los datos necesarios y completar el panel paso a paso para que las reservas por WhatsApp funcionen de forma ordenada.

Fecha de la guia: 2026-06-30

## 1. Que vas a conseguir al terminar

Al finalizar esta configuracion, el restaurante podra:

- Recibir solicitudes de reserva por WhatsApp.
- Responder automaticamente cuando haya horario y mesa disponible.
- Evitar aceptar reservas fuera del horario del restaurante.
- Evitar aceptar mas personas de las que caben en sala.
- Organizar mesas por salon, terraza, barra u otras areas.
- Consultar reservas, clientes y reportes desde el panel.
- Dar acceso al equipo sin compartir tu propia cuenta.

## 2. Antes de entrar al panel

Antes de completar el panel necesitas tener preparada la cuenta oficial de WhatsApp Business en Meta.

Necesitaras:

- Una cuenta de Meta Business para el restaurante.
- Un numero de telefono que se usara como WhatsApp oficial del restaurante.
- Acceso al administrador de Meta donde esta configurado WhatsApp Business.
- Los datos de conexion que luego se pegaran en el panel:
  - WhatsApp Business Phone Number ID.
  - WhatsApp Business Account ID.
  - Meta Permanent Access Token.
  - WhatsApp App Secret.

Importante: usa preferiblemente un numero dedicado al restaurante. Evita usar el WhatsApp personal del dueno o de un empleado, porque ese numero sera el canal oficial de reservas.

## 3. Paso 1: elegir o preparar el numero de WhatsApp

El numero que uses debe ser el numero que los clientes reconoceran como el WhatsApp del restaurante.

Recomendacion:

- Usa un numero nuevo o un numero exclusivo para reservas.
- Asegurate de que el numero pueda recibir SMS o llamadas durante la configuracion.
- No uses un numero que dependa de una persona concreta del equipo.
- Si ya tienes un WhatsApp Business funcionando, revisa con tu proveedor o con Meta si se puede migrar sin perder el servicio actual.

Ejemplo:

- Correcto: `+34 600 000 000` como WhatsApp oficial de reservas del restaurante.
- No recomendado: el numero personal del encargado de sala.

## 4. Paso 2: obtener los datos en Meta

En Meta, entra al area donde gestionas WhatsApp Business del restaurante. Los nombres exactos pueden cambiar con el tiempo, pero normalmente encontraras estas zonas dentro de Meta Business o Meta for Developers.

### 4.1. Crear o seleccionar el negocio

1. Entra con la cuenta de Meta que administra el negocio.
2. Abre el administrador del negocio.
3. Selecciona el negocio del restaurante.
4. Comprueba que el nombre, direccion, web y datos fiscales o comerciales sean correctos.

Consejo: si el negocio todavia no esta verificado, completa esa verificacion cuanto antes. Algunas funciones de WhatsApp pueden quedar limitadas hasta que Meta apruebe el negocio.

### 4.2. Crear o seleccionar la cuenta de WhatsApp Business

1. Busca la seccion de WhatsApp dentro del administrador de Meta.
2. Crea una cuenta de WhatsApp Business si todavia no existe.
3. Asocia el numero de telefono que usara el restaurante.
4. Confirma el numero con el codigo que Meta enviara por SMS o llamada.
5. Revisa que el nombre visible del WhatsApp sea el nombre del restaurante o una variante clara.

El nombre visible es importante porque es lo que vera el cliente cuando escriba al restaurante.

### 4.3. Localizar el WhatsApp Business Account ID

Este dato identifica la cuenta de WhatsApp Business del restaurante dentro de Meta.

Donde buscarlo:

1. Entra en la configuracion de WhatsApp Business dentro de Meta.
2. Busca el apartado de informacion de la cuenta.
3. Copia el valor llamado `WhatsApp Business Account ID`.

Guardalo temporalmente en una nota segura. Luego lo pegaras en el panel.

### 4.4. Localizar el WhatsApp Business Phone Number ID

Este dato identifica el numero concreto que recibira y enviara mensajes.

Donde buscarlo:

1. Entra en la lista de numeros de WhatsApp.
2. Selecciona el numero del restaurante.
3. Copia el valor llamado `Phone Number ID` o `WhatsApp Business Phone Number ID`.

No lo confundas con el numero de telefono visible. El `Phone Number ID` suele ser una serie larga de numeros.

### 4.5. Obtener el Meta Permanent Access Token

Este dato es una clave larga que permite que la aplicacion envie y reciba mensajes en nombre del WhatsApp del restaurante.

Recomendacion sencilla:

1. Pide a la persona que administra Meta que cree un token permanente para el negocio.
2. Asegurate de que el token tenga permisos para usar WhatsApp Business.
3. Copia el token completo.
4. Guardalo en un lugar seguro hasta pegarlo en el panel.

No compartas este token por WhatsApp, correo abierto o documentos publicos. Tratalo como una contrasena.

### 4.6. Obtener el WhatsApp App Secret

Este dato ayuda a confirmar que los mensajes que llegan vienen realmente de Meta.

Donde buscarlo:

1. Entra en la aplicacion de Meta asociada a WhatsApp.
2. Busca la seccion de configuracion basica de la aplicacion.
3. Copia el valor llamado `App Secret`.

Tambien debe guardarse como una clave privada.

### 4.7. Configurar la URL de callback

La URL de callback es la direccion donde Meta enviara los mensajes que escriben tus clientes.

En el panel, la veras dentro de la seccion WhatsApp como:

```text
URL de callback para WhatsApp
```

Copia esa URL y pegala en Meta, en la configuracion de webhooks o callbacks de WhatsApp.

Si Meta te pide una palabra o codigo de verificacion, usa el valor que te entregue el equipo de soporte o la persona que instala el sistema. Ese valor debe coincidir exactamente con el configurado para tu restaurante.

Espacio para captura:

> Captura recomendada: pantalla de Meta donde se ve el numero de WhatsApp, el `Phone Number ID` y la configuracion del webhook.

## 5. Paso 3: entrar al panel del restaurante

1. Abre el panel de WhatBoo.
2. Inicia sesion con tu email, contrasena y restaurante.
3. En el menu lateral veras las secciones principales:
   - Reservas.
   - Clientes.
   - Mesas y areas.
   - Configuracion.
   - Reportes.
   - WhatsApp.
   - Usuarios.

La configuracion recomendada es hacerlas en este orden:

1. WhatsApp.
2. Mesas y areas.
3. Configuracion del restaurante.
4. Usuarios.
5. Prueba de reservas.

## 6. Paso 4: completar la seccion WhatsApp

En el menu lateral, entra en `WhatsApp`.

Veras la pantalla `WhatsApp del restaurante`.

Aqui debes completar los datos que obtuviste en Meta:

| Campo del panel | Que debes poner | Como reconocerlo |
| --- | --- | --- |
| WhatsApp Business Phone Number ID | El ID del numero de WhatsApp | Suele ser una serie larga de numeros |
| WhatsApp Business Account ID | El ID de la cuenta de WhatsApp Business | Tambien suele ser una serie larga de numeros |
| Meta Permanent Access Token | El token permanente de Meta | Es una clave larga, parecida a una contrasena |
| WhatsApp App Secret | La clave secreta de la aplicacion de Meta | Es una clave privada de la app |

Cuando termines:

1. Revisa que no haya espacios al principio o al final.
2. Pulsa `Persistir Tokens de Meta`.
3. Espera el mensaje de confirmacion.

Buenas practicas:

- No pegues capturas de estos campos en grupos de WhatsApp.
- No compartas el token con empleados que no administren el sistema.
- Si sospechas que alguien vio el token, pide regenerarlo en Meta.

Espacio para captura:

> Captura recomendada: pantalla `WhatsApp del restaurante` con los campos visibles, pero con los tokens ocultos.

## 7. Paso 5: configurar salones, areas y mesas

Entra en `Mesas y areas`.

Esta seccion sirve para decirle al sistema como esta organizado el restaurante fisicamente. WhatsApp usara esta informacion para saber si hay sitio disponible.

### 7.1. Crear areas o zonas

Un area es una parte del restaurante, por ejemplo:

- Salon principal.
- Terraza.
- Barra.
- Reservado.
- Planta alta.
- Jardin.

Para crear un area:

1. Ve al bloque `Anadir area`.
2. En `Nombre de Zona`, escribe el nombre del area.
3. En `Prioridad de llenado`, pon el orden en el que quieres que el sistema use esa zona.
4. Pulsa `Crear Zona`.

Como funciona la prioridad:

- Prioridad `1`: se llena primero.
- Prioridad `2`: se usa despues.
- Prioridad `3`: se usa despues de la 1 y la 2.

Ejemplo recomendado:

| Zona | Prioridad | Por que |
| --- | --- | --- |
| Salon principal | 1 | Es el area mas habitual para reservas |
| Terraza | 2 | Se usa si hay buen clima o alta demanda |
| Barra | 3 | Se usa para reservas pequenas o ultima opcion |

Consejo: si quieres que WhatsApp asigne primero las mesas del salon principal, dale prioridad `1`.

### 7.2. Crear mesas

Cada mesa debe tener un nombre y una capacidad.

Para crear una mesa:

1. Ve al bloque `Anadir mesa`.
2. En `Numero o Codigo de Mesa`, escribe el nombre de la mesa.
3. En `Capacidad de Asiento`, indica cuantas personas caben comodamente.
4. En `Zona Operativa`, elige a que area pertenece.
5. Pulsa `Crear Mesa`.

Ejemplos:

| Mesa | Capacidad | Zona |
| --- | --- | --- |
| Mesa 1 | 2 | Salon principal |
| Mesa 2 | 4 | Salon principal |
| Mesa 3 | 6 | Salon principal |
| Terraza 1 | 4 | Terraza |
| Barra 1 | 2 | Barra |

Importante: escribe la capacidad real y comoda. Si una mesa es de 4 pero solo acepta 5 personas en casos especiales, dejala como 4 y maneja la excepcion manualmente.

### 7.3. Revisar el aforo activo

Arriba veras `Aforo activo`. Ese numero suma la capacidad de todas las mesas activas.

Revisa que tenga sentido:

- Si tu restaurante tiene 50 plazas reales, el aforo activo deberia acercarse a 50.
- Si el numero sale demasiado alto, revisa mesas duplicadas.
- Si sale demasiado bajo, puede faltar alguna mesa o zona.

### 7.4. Editar o desactivar areas y mesas

En cada zona y mesa veras botones como `Editar` y `Desactivar`.

Usalos asi:

- `Editar`: para cambiar nombre, prioridad, capacidad o zona.
- `Desactivar`: para retirar temporalmente una zona o mesa del sistema.

Ejemplos de uso:

- Desactiva una terraza si estara cerrada por temporada.
- Desactiva una mesa si esta rota o no se usara durante una reforma.
- Edita la capacidad si cambias la distribucion de sala.

Espacio para captura:

> Captura recomendada: pantalla `Salones, areas y mesas` despues de crear varias zonas y mesas.

## 8. Paso 6: configurar horarios, duracion y capacidad

Entra en `Configuracion`.

Esta seccion le dice al sistema cuando puede aceptar reservas y cuales son los limites del restaurante.

### 8.1. Intervalo de bloques

El campo `Intervalo de Bloques` define cada cuanto tiempo se ofrecen horarios de reserva.

Opciones habituales:

- 15 minutos: mas flexible, mas detalle.
- 30 minutos: recomendado para la mayoria de restaurantes.
- 60 minutos: mas simple, menos opciones para el cliente.

Ejemplo:

Si eliges 30 minutos, el cliente podra pedir horarios como 20:00, 20:30, 21:00 o 21:30.

### 8.2. Duracion promedio de mesa

El campo `Duracion Promedio de Mesa` indica cuanto tiempo suele ocupar una mesa una reserva.

Ejemplos:

- Restaurante casual: 75 a 90 minutos.
- Restaurante de cena tranquila: 90 a 120 minutos.
- Menu degustacion: 120 a 180 minutos.

Recomendacion: empieza con un valor prudente. Es mejor dejar un poco de margen que llenar demasiado la sala.

### 8.3. Buffer o cortesia entre reservas

El campo `Buffer / Cortesia entre Reservas` indica el tiempo extra entre una reserva y la siguiente.

Sirve para:

- Limpiar la mesa.
- Reorganizar sala.
- Evitar retrasos acumulados.

Ejemplo:

Si una reserva dura 90 minutos y pones 15 minutos de buffer, el sistema dejara 105 minutos antes de volver a usar esa mesa.

### 8.4. Capacidad maxima del restaurante

El campo `Capacidad Maxima del Restaurante` sirve como limite general.

Usalo si quieres que el sistema nunca supere cierto numero de personas al mismo tiempo o durante la operacion.

Ejemplo:

Aunque tus mesas sumen 60 plazas, puedes poner 50 si normalmente operas con menos equipo.

### 8.5. Maximo de personas por reserva

El campo `Maximo de Personas por Reserva` evita que WhatsApp acepte reservas demasiado grandes automaticamente.

Ejemplos:

- Si aceptas grupos normales hasta 8 personas, pon `8`.
- Si los grupos grandes deben llamar, pon `8` y gestiona grupos mayores manualmente.

Mensaje practico para el equipo:

Si un cliente pide 12 personas y el maximo automatico es 8, el sistema no deberia confirmarlo automaticamente. Asi alguien del restaurante puede revisar si conviene aceptarlo.

### 8.6. Maximo de reservas por bloque horario

El campo `Maximo de Reservas por Slot` limita cuantas reservas pueden entrar en el mismo horario.

Ejemplo:

Si no quieres que entren 10 reservas a las 21:00 aunque haya mesas, puedes poner un limite para repartir mejor la llegada de clientes.

### 8.7. Duracion operativa de slot

El campo `Duracion Operativa de Slot` ayuda al sistema a organizar cada bloque de disponibilidad.

Para la mayoria de restaurantes, usa un valor parecido a la duracion promedio de mesa.

### 8.8. Capacidad maxima diaria

El campo `Capacidad Maxima Diaria` limita el total de personas que el restaurante puede aceptar en un dia.

Es util si:

- Tienes cocina limitada.
- Tienes poco personal.
- Hay eventos especiales.
- Quieres controlar la carga de trabajo.

### 8.9. Permitir sobreventa controlada

La opcion `Permitir sobreventa controlada` permite aceptar mas reservas de lo normal en algunos casos.

Recomendacion:

- Dejale desactivada al principio.
- Activala solo si tienes experiencia gestionando sobreventa.
- Usala en restaurantes con mucha rotacion y equipo preparado.

## 9. Paso 7: configurar el horario semanal

En la misma pantalla `Configuracion`, baja hasta `Horario semanal`.

Para cada dia:

1. Revisa si el restaurante abre o cierra.
2. Escribe la hora de apertura.
3. Escribe la hora de cierre.
4. Marca `Cerrado` en los dias que no trabajas.

Ejemplo:

| Dia | Apertura | Cierre | Cerrado |
| --- | --- | --- | --- |
| Lunes | - | - | Si |
| Martes | 13:00 | 23:00 | No |
| Miercoles | 13:00 | 23:00 | No |
| Jueves | 13:00 | 23:00 | No |
| Viernes | 13:00 | 00:00 | No |
| Sabado | 13:00 | 00:00 | No |
| Domingo | 13:00 | 17:00 | No |

Importante: el horario semanal se usa para validar disponibilidad desde WhatsApp y desde el panel. Si el lunes esta marcado como cerrado, WhatsApp no deberia confirmar reservas para ese lunes.

## 10. Paso 8: configurar automatizacion de WhatsApp

En `Configuracion`, busca el bloque `Automatizacion de WhatsApp`.

### 10.1. Confirmacion inmediata

Si activas `Confirmacion inmediata`, el sistema podra confirmar automaticamente una reserva cuando:

- El restaurante este abierto.
- Haya mesa disponible.
- La cantidad de personas sea valida.
- No se superen los limites configurados.

Recomendacion:

- Activala cuando ya hayas revisado bien horarios, mesas y capacidad.
- Si todavia estas probando, puedes dejarla desactivada al principio.

### 10.2. Lista de espera automatica

Si activas `Lista de espera automatica`, el sistema podra guardar solicitudes cuando no haya disponibilidad.

Ejemplo:

Un cliente pide mesa para 4 a las 21:00, pero no hay sitio. El sistema puede dejarlo en espera para que el equipo lo revise si se libera una mesa.

Recomendacion:

- Activala si tu equipo revisa la lista de espera durante el servicio.
- Si nadie la revisara, es mejor dejarla desactivada.

Cuando termines esta pantalla, pulsa `Guardar Configuracion del restaurante`.

Espacio para captura:

> Captura recomendada: pantalla `Configuracion del restaurante` con horarios, limites y automatizacion de WhatsApp.

## 11. Paso 9: invitar al equipo

Entra en `Usuarios`.

Esta seccion sirve para que cada persona use su propia cuenta.

Para invitar a alguien:

1. Escribe su nombre.
2. Escribe sus apellidos.
3. Escribe su correo electronico.
4. Elige su rol.
5. Pulsa `Enviar invitacion`.

Roles recomendados:

| Rol | Para quien | Que uso darle |
| --- | --- | --- |
| MANAGER | Gerente, encargado, responsable de sala | Puede administrar la operacion diaria |
| STAFF | Camareros, recepcion, equipo operativo | Puede consultar y gestionar reservas |

Buenas practicas:

- No compartas tu usuario de dueno.
- Suspende usuarios cuando una persona deje de trabajar en el restaurante.
- Da rol de manager solo a personas que realmente deban administrar la operacion.

## 12. Paso 10: probar una reserva por WhatsApp

Antes de anunciar el canal a clientes, haz pruebas.

Usa otro telefono y escribe al WhatsApp oficial del restaurante.

Prueba 1: reserva normal

1. Escribe un mensaje como: `Hola, quiero reservar para 2 personas esta noche a las 21:00`.
2. Comprueba que el sistema entiende la solicitud.
3. Revisa si la reserva aparece en `Reservas`.
4. Confirma que la hora, nombre, telefono y numero de personas son correctos.

Prueba 2: fuera de horario

1. Pide una reserva para un dia cerrado o una hora fuera del horario.
2. Comprueba que el sistema no confirma una reserva incorrecta.

Prueba 3: grupo demasiado grande

1. Pide una reserva para mas personas que el maximo configurado.
2. Comprueba que el sistema no la confirma automaticamente.

Prueba 4: sin mesas disponibles

1. Simula una hora con todas las mesas ocupadas.
2. Comprueba si el sistema rechaza la solicitud o la manda a lista de espera, segun tu configuracion.

## 13. Paso 11: revisar la pantalla de Reservas

Entra en `Reservas`.

Aqui veras la agenda del dia y podras:

- Consultar reservas confirmadas.
- Ver turnos pendientes.
- Ver comensales asignados.
- Imprimir la lista de hoy.
- Marcar una reserva como sentada.
- Marcar `No-show` si el cliente no llega.
- Cancelar una reserva indicando el motivo.

Cuando canceles o marques no-show:

1. Elige el motivo.
2. Escribe un detalle breve.
3. Guarda la accion.

Ejemplos de detalle:

- `Cliente llamo para cancelar por enfermedad`.
- `No se presento despues de 20 minutos de cortesia`.
- `Reserva duplicada por error`.

Esto ayuda a entender despues que paso y mejora los reportes.

## 14. Paso 12: revisar Clientes

Entra en `Clientes`.

Esta seccion te ayuda a conocer mejor a tus clientes.

Podras:

- Buscar por nombre, telefono o email.
- Ver historial de reservas.
- Ver reservas completadas, canceladas y no-show.
- Llamar al cliente.
- Abrir WhatsApp.
- Enviar email si existe.
- Revisar preferencias o notas de sala.

Uso recomendado:

- Antes del servicio, revisa clientes frecuentes o VIP.
- Si alguien tuvo varios no-show, tenlo en cuenta antes de confirmar grandes reservas.
- Usa las notas para alergias, preferencias de mesa o detalles de atencion.

## 15. Paso 13: revisar Reportes

Entra en `Reportes`.

Aqui puedes elegir un rango de fechas y revisar:

- Reservas del periodo.
- Cubiertos.
- Asistencia.
- Cancelaciones.
- No-show.
- Reservas por dia.

Para usarlo:

1. Selecciona `Desde`.
2. Selecciona `Hasta`.
3. Revisa los indicadores.
4. Usa `Exportar / Imprimir PDF` si quieres guardar o compartir el reporte.

Recomendacion:

- Revisa reportes semanalmente.
- Mira especialmente cancelaciones y no-show.
- Usa esos datos para ajustar horarios, politica de reservas y capacidad.

## 16. Checklist final antes de abrir WhatsApp al publico

Marca cada punto antes de publicar el numero:

- [ ] El numero de WhatsApp oficial esta activo en Meta.
- [ ] El nombre visible del restaurante esta correcto.
- [ ] El `Phone Number ID` esta copiado en el panel.
- [ ] El `Business Account ID` esta copiado en el panel.
- [ ] El token permanente esta copiado en el panel.
- [ ] El App Secret esta copiado en el panel.
- [ ] La URL de callback esta configurada en Meta.
- [ ] Hay zonas creadas en `Mesas y areas`.
- [ ] Todas las mesas reales estan creadas.
- [ ] La capacidad de cada mesa es correcta.
- [ ] El aforo activo tiene sentido.
- [ ] Los horarios semanales estan revisados.
- [ ] Los dias cerrados estan marcados como cerrados.
- [ ] La duracion promedio de mesa es realista.
- [ ] El buffer entre reservas esta configurado.
- [ ] El maximo de personas por reserva esta definido.
- [ ] La confirmacion inmediata esta activada solo si todo lo anterior esta revisado.
- [ ] Se hizo una prueba de reserva normal por WhatsApp.
- [ ] Se hizo una prueba fuera de horario.
- [ ] Se hizo una prueba con grupo grande.
- [ ] El equipo sabe revisar `Reservas`.
- [ ] El equipo sabe cancelar y marcar no-show con motivo.

## 17. Rutina recomendada de mantenimiento

Cada dia antes del servicio:

- Revisa reservas de hoy.
- Comprueba si hay turnos pendientes.
- Confirma que no haya mesas desactivadas por error.

Cada semana:

- Revisa reportes.
- Ajusta horarios si cambian turnos.
- Revisa no-show y cancelaciones.

Cada mes:

- Revisa usuarios activos.
- Suspende accesos de personas que ya no trabajan en el restaurante.
- Revisa si el token o configuracion de Meta siguen correctos.
- Ajusta capacidad si cambia la distribucion de sala.

## 18. Errores comunes y como evitarlos

| Situacion | Que suele pasar | Como evitarlo |
| --- | --- | --- |
| El cliente escribe y no aparece la reserva | Falta configurar la URL de callback en Meta | Revisa la seccion WhatsApp y la configuracion de Meta |
| WhatsApp acepta reservas en un dia cerrado | El dia no esta marcado como cerrado | Revisa `Horario semanal` |
| Se aceptan demasiadas reservas a la vez | Los limites son demasiado amplios | Ajusta maximo por bloque, capacidad y duracion |
| Una mesa aparece disponible pero no deberia | La mesa sigue activa | Desactiva la mesa en `Mesas y areas` |
| El equipo comparte un solo usuario | No se invitaron usuarios individuales | Crea usuarios en `Usuarios` |
| Hay muchas reservas manuales fuera de control | No se revisan reportes ni no-show | Revisa reportes semanalmente |

## 19. Datos que conviene tener preparados

Antes de empezar, puedes completar esta plantilla:

| Dato | Valor |
| --- | --- |
| Nombre del restaurante |  |
| Numero oficial de WhatsApp |  |
| Responsable de Meta |  |
| Email del dueno |  |
| Horario semanal |  |
| Maximo de personas por reserva |  |
| Duracion promedio de mesa |  |
| Buffer entre reservas |  |
| Zonas del restaurante |  |
| Numero total de mesas |  |
| Aforo real aproximado |  |
| Personas que tendran acceso al panel |  |

## 20. Resumen rapido

El orden mas seguro es:

1. Preparar el numero oficial en Meta.
2. Copiar los datos de WhatsApp en el panel.
3. Crear zonas y mesas.
4. Configurar horarios y limites.
5. Activar automatizacion cuando todo este revisado.
6. Invitar al equipo.
7. Probar reservas reales antes de publicar el canal.
8. Revisar reservas, clientes y reportes durante la operacion.

Si sigues estos pasos, WhatsApp tendra la informacion necesaria para responder de forma coherente, evitar reservas imposibles y ayudar al equipo a trabajar con una agenda clara.
