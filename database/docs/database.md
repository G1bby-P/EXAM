# Especificacion de base de datos

## Alcance

Esta base de datos cubre la persistencia inicial de una plataforma web de examenes:

- Usuarios, roles y tokens.
- Banco de preguntas.
- Examenes editables.
- Versiones publicadas e inmutables de examenes.
- Asignaciones a estudiantes.
- Intentos, respuestas, resultados y revision.
- Archivos adjuntos.
- Auditoria.

No cubre todavia integraciones externas, pagos, multitenancy, proctoring avanzado ni reporteria agregada.

## Convenciones

- Base de datos: PostgreSQL.
- ORM: Prisma 7.
- IDs: UUID generados con `gen_random_uuid()`.
- Timestamps: `TIMESTAMPTZ(6)`.
- Tablas y columnas: `snake_case`.
- Modelos y campos Prisma: `PascalCase` y `camelCase`.
- Configuracion Prisma: `prisma.config.ts` contiene `DATABASE_URL` y ruta de migraciones.
- Prisma Client: se genera en `generated/prisma` y usa adapter PostgreSQL.
- Eliminacion logica: `deleted_at` o `archived_at` donde aplica.
- Examen publicado: se congela como version para proteger intentos historicos.

## Tablas

### Identidad y seguridad

- `users`: cuentas del sistema.
- `roles`: catalogo de roles (`ADMIN`, `REVIEWER`, `STUDENT`).
- `user_roles`: relacion muchos-a-muchos entre usuarios y roles.
- `refresh_tokens`: tokens de sesion persistente.
- `password_reset_tokens`: tokens de recuperacion de contrasena.

### Banco de preguntas

- `tags`: etiquetas para clasificar preguntas.
- `questions`: preguntas maestras editables.
- `question_options`: opciones para preguntas objetivas.
- `question_tags`: relacion muchos-a-muchos entre preguntas y etiquetas.

### Examen editable

- `exams`: definicion editable del examen.
- `exam_sections`: secciones de un examen editable.
- `exam_questions`: preguntas incluidas en un examen editable.

### Version publicada

- `exam_versions`: snapshot publicado del examen.
- `exam_version_sections`: snapshot de secciones publicadas.
- `exam_version_questions`: snapshot de preguntas publicadas.

Estas tablas son clave para produccion: un intento nunca debe depender del borrador editable.

### Ejecucion y calificacion

- `exam_assignments`: asignaciones de examen versionado a usuarios.
- `exam_attempts`: intentos de examen.
- `attempt_answers`: respuestas guardadas por intento.
- `results`: resultado consolidado de un intento.
- `file_assets`: archivos subidos para respuestas o material asociado.

### Auditoria

- `audit_logs`: eventos criticos como seed, publicacion, asignacion, revision y cambios administrativos.

## Relaciones principales

- Un usuario puede tener muchos roles mediante `user_roles`.
- Un examen tiene muchas secciones y preguntas editables.
- Un examen puede tener muchas versiones publicadas.
- Una version publicada tiene sus propias secciones y preguntas congeladas.
- Una asignacion apunta a un usuario y a una version publicada.
- Un intento apunta a una asignacion y a una version publicada.
- Una respuesta apunta a una pregunta versionada.
- Un resultado apunta a un intento.
- Un archivo puede estar asociado a una respuesta.
- Los logs de auditoria pueden apuntar al usuario actor y a una entidad afectada.

## Indices

Indices criticos incluidos:

- `users_email_normalized_key`: evita correos duplicados por diferencia de mayusculas.
- `user_roles_user_id_role_id_key`: evita roles duplicados por usuario.
- `questions_type_status_idx`: filtros del banco de preguntas.
- `exams_slug_key`: URL o identificador estable del examen.
- `exam_versions_exam_id_version_number_key`: version unica por examen.
- `exam_assignments_active_user_version_key`: evita una asignacion activa duplicada del mismo examen versionado al mismo usuario.
- `exam_attempts_assignment_id_attempt_number_key`: evita intentos duplicados por numero.
- `attempt_answers_attempt_id_exam_version_question_id_key`: garantiza una respuesta por pregunta dentro de un intento.
- `results_attempt_id_key`: garantiza un resultado por intento.
- Indices por `status`, `created_at`, `published_at`, `user_id` y `exam_version_id` para consultas operativas.

## Restricciones

Restricciones relevantes:

- Email normalizado debe ser `lower(trim(email))`.
- Preguntas archivadas requieren `archived_at`.
- Examen publicado requiere `published_at`.
- Version retirada requiere `retired_at`.
- Puntajes no pueden ser negativos.
- Porcentajes deben estar entre 0 y 100.
- Fechas de disponibilidad y asignacion deben ser coherentes.
- Numeros de intento y orden deben ser positivos.
- Un resultado publicado requiere `published_at`.
- El `exam_id` de una asignacion debe coincidir con el `exam_id` de su `exam_version`.

## Seed

El seed crea:

- Roles: administrador, revisor y estudiante.
- Usuarios base para cada rol.
- Tres preguntas de ejemplo.
- Un examen diagnostico publicado.
- Una version publicada del examen.
- Una asignacion activa para el estudiante.
- Un evento inicial de auditoria.

El seed es idempotente: puede ejecutarse varias veces sin duplicar datos base.

## Riesgos y decisiones pendientes

- No se incluyo multitenancy porque no fue confirmado.
- No se incluyo proctoring avanzado porque requiere requisitos de privacidad y cumplimiento.
- No se incluyeron grupos/cohortes; por ahora las asignaciones son por usuario.
- La politica exacta para mostrar resultados queda parametrizada con `result_visibility`, pero la regla final se definira en backend.
- Las respuestas abiertas usan revision manual mediante `review_status`.

## Criterio de terminado de Fase 2

La fase queda completa si existen:

- Esquema Prisma.
- Migracion SQL inicial.
- Seed idempotente.
- Documentacion de tablas, relaciones, indices y restricciones.
- Diagrama ER.
