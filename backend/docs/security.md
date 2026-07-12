# Seguridad

## Autenticacion

El backend usa JWT de acceso y refresh tokens rotativos.

- Access token: corto plazo.
- Refresh token: largo plazo, revocable y rotativo.
- Refresh token almacenado como hash SHA-256 con `JWT_REFRESH_SECRET`.
- Passwords almacenados con bcrypt.

## Autorizacion

El backend usa RBAC:

- `ADMIN`: administracion completa.
- `REVIEWER`: gestion/revision academica y resultados.
- `STUDENT`: acceso a examenes asignados y resultados publicados.

Todas las rutas son protegidas por defecto mediante guard global. Las rutas publicas requieren `@Public()`.

## Validacion

Se aplica `ValidationPipe` global:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

## Auditoria

El interceptor global registra operaciones mutantes (`POST`, `PATCH`, `DELETE`) en `audit_logs`. Los servicios tambien registran eventos criticos explicitos como login, publicacion de examen, revision y publicacion de resultados.

## Seguridad del intento de examen

Los intentos de examen registran eventos de supervisión en `exam_security_events` y duplican la trazabilidad administrativa en `audit_logs` con la accion `EXAM_SECURITY_EVENT_RECORDED`.

Eventos soportados:

- `FULLSCREEN_ENTERED`
- `FULLSCREEN_EXITED`
- `TAB_HIDDEN`
- `TAB_VISIBLE`
- `WINDOW_BLUR`
- `WINDOW_FOCUS`
- `COPY_BLOCKED`
- `PASTE_BLOCKED`
- `CUT_BLOCKED`
- `CONTEXT_MENU_BLOCKED`
- `KEYBOARD_SHORTCUT_BLOCKED`
- `PRINT_BLOCKED`

Endpoints:

- `POST /exam-attempts/:attemptId/security-events`: registra un evento del intento autenticado.
- `GET /exam-attempts/:attemptId/security-events`: lista eventos para `ADMIN` y `REVIEWER`.

Los eventos se aceptan solo para intentos en progreso. El backend registra IP mediante `request.ip`; si la API esta detras de un proxy confiable, activar `TRUST_PROXY=true`.

## Protecciones HTTP

- Helmet.
- CORS configurable.
- Filtro global de excepciones.
- Logs HTTP con duracion y status.

## Pendientes para fases futuras

- Rate limiting.
- MFA para administradores.
- Politica de bloqueo por intentos fallidos.
- Proctoring avanzado con camara, identidad y deteccion asistida.
- Revision de cabeceras especificas del entorno de despliegue.
