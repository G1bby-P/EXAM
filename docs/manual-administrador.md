# Manual del administrador

## Acceso

Ingresar al panel administrador desde el dominio configurado, por ejemplo:

```text
https://admin.example.com
```

Usar credenciales asignadas por el equipo tecnico. No compartir cuentas.

## Dashboard

El dashboard muestra el estado general de la plataforma:

- Usuarios recientes.
- Cursos y temas.
- Preguntas.
- Examenes.
- Resultados.
- Logs recientes.
- Estadisticas.

## Usuarios y roles

Roles disponibles:

- `ADMIN`: administracion completa.
- `REVIEWER`: gestion academica y revision.
- `STUDENT`: acceso a examenes y resultados.

Buenas practicas:

- Asignar el minimo rol necesario.
- Desactivar usuarios que ya no deben acceder.
- Revisar cambios sensibles en auditoria.

## Cursos y temas

Los cursos agrupan temas. Los temas organizan preguntas y examenes.

Flujo recomendado:

1. Crear curso.
2. Crear temas del curso.
3. Asociar preguntas a temas.
4. Crear examenes con preguntas publicadas.

## Banco de preguntas

Tipos soportados:

- Opcion multiple.
- Verdadero/Falso.
- Seleccion multiple.
- Desarrollo.
- Casos clinicos.
- Imagenes.
- Video.
- Audio.
- PDF.
- Importacion desde Excel.

Buenas practicas:

- Revisar redaccion antes de publicar.
- Evitar respuestas ambiguas.
- Validar alternativas correctas.
- Usar tags y dificultad cuando aplique.

## Examenes

Flujo:

1. Crear examen.
2. Agregar secciones si corresponde.
3. Agregar preguntas.
4. Configurar tiempo, intentos y visibilidad de resultados.
5. Publicar version.
6. Asignar a alumnos.

Una version publicada debe tratarse como historica. Si cambia el contenido, publicar una nueva version.

## Resultados

Los resultados objetivos pueden calcularse automaticamente. Las preguntas de desarrollo, archivo o caso clinico pueden requerir revision manual.

Acciones:

- Revisar respuestas pendientes.
- Asignar puntaje manual.
- Publicar resultado cuando corresponda.
- Exportar reportes si se requiere.

## Estadisticas y reportes

Usar filtros por curso, tema, examen, fechas y estado para revisar:

- Promedios.
- Ranking.
- Distribucion de resultados.
- Reportes exportables.

## Exportaciones

Formatos soportados:

- Excel.
- PDF.

Exportaciones disponibles:

- Resultados.
- Reportes.
- Historial.

## Seguridad y auditoria

Revisar periodicamente:

- `/logs`
- Eventos `EXAM_SECURITY_EVENT_RECORDED`
- Eventos criticos de examen:
  - salida de pantalla completa.
  - cambio de pestana.
  - intento de impresion.
  - atajos bloqueados.

Los eventos de seguridad no prueban fraude por si solos; son evidencia para revision academica.

## Cierre de jornada

Checklist operativo:

- Revisar resultados pendientes.
- Revisar eventos criticos.
- Confirmar exportaciones solicitadas.
- Cerrar sesion.
