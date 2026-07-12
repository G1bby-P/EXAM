# Arquitectura backend

## Estilo

El backend usa arquitectura modular por dominios sobre NestJS:

- `common`: decoradores, guardas, filtros, interceptores y utilidades compartidas.
- `config`: validacion de variables de entorno.
- `database`: cliente Prisma y conexion PostgreSQL.
- `modules`: dominios funcionales.

## Modulos

- `auth`: login, refresh, logout y perfil actual.
- `users`: CRUD administrativo y asignacion de roles.
- `roles`: catalogo de roles.
- `courses`: cursos.
- `topics`: temas por curso.
- `questions`: preguntas y alternativas.
- `exams`: gestion de examenes, publicacion, asignacion e intentos.
- `results`: resultados, revision manual y publicacion.
- `audit`: auditoria persistente.
- `logs`: consulta administrativa de logs de auditoria.
- `health`: health check publico.

## Flujo de autenticacion

1. El usuario envia email y password a `POST /auth/login`.
2. El backend valida estado activo y password bcrypt.
3. Se emite access token JWT.
4. Se crea refresh token aleatorio.
5. El refresh token se guarda como hash deterministico con secreto servidor.
6. `POST /auth/refresh` revoca el refresh anterior y emite un par nuevo.
7. `POST /auth/logout` revoca el refresh token actual.

## Flujo de examen

1. Admin/revisor crea examen.
2. Admin/revisor crea secciones.
3. Admin/revisor agrega preguntas.
4. Admin publica el examen.
5. El backend crea una version inmutable del examen.
6. Admin asigna la version a un estudiante.
7. Estudiante inicia intento.
8. Estudiante guarda respuestas.
9. Estudiante envia intento.
10. Backend califica respuestas objetivas.
11. Respuestas abiertas quedan pendientes de revision.
12. Revisor/admin revisa y publica resultado.

## Decision importante

`Cursos` y `Temas` no existian en Fase 2. En esta fase se agregaron con una migracion incremental, manteniendo compatibilidad con las tablas ya definidas.
