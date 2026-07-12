# Vistas del panel administrativo

## Login

Ruta: `/login`

Permite iniciar sesion contra el backend. Despues del login valida que el usuario tenga rol `ADMIN` o `REVIEWER`.

## Tablero

Ruta: `/admin`

Muestra conteos y actividad reciente de usuarios, cursos, temas, preguntas, examenes, resultados y auditoria.

## Usuarios

Ruta: `/admin/users`

Permite listar y crear usuarios. La asignacion inicial de rol se envia al backend.

## Roles

Ruta: `/admin/roles`

Muestra el catalogo de roles usado por RBAC.

## Cursos

Ruta: `/admin/courses`

Permite listar y crear cursos.

## Temas

Ruta: `/admin/topics`

Permite listar y crear temas asociados a cursos.

## Preguntas y alternativas

Ruta: `/admin/questions`

Permite listar preguntas, crear preguntas y agregar alternativas a preguntas objetivas.

## Examenes

Ruta: `/admin/exams`

Permite crear examenes, agregar secciones, agregar preguntas, publicar versiones y asignar examenes a usuarios.

## Resultados

Ruta: `/admin/results`

Permite listar resultados, revisar respuestas, guardar puntaje manual y publicar resultados.

## Auditoria

Ruta: `/admin/audit`

Permite consultar eventos de auditoria.

## Configuracion

Ruta: `/admin/settings`

Muestra la URL de API configurada y verifica el endpoint publico de health.

## Excluido

No existe pantalla para resolver examenes como alumno. Esa experiencia queda pendiente para una fase futura autorizada.
