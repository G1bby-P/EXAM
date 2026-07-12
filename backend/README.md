# Fase 3 - Backend NestJS

Backend REST para la plataforma de examenes. Esta fase no incluye frontend.

## Stack

- NestJS
- PostgreSQL
- Prisma 7
- JWT access tokens
- Refresh tokens rotativos
- RBAC por roles
- Swagger/OpenAPI
- Auditoria persistente en `audit_logs`

## Modulos incluidos

- Autenticacion
- JWT
- Refresh tokens
- Roles
- Usuarios
- Cursos
- Temas
- Preguntas
- Alternativas
- Examenes
- Resultados
- Logs
- Auditoria
- Swagger

## Requisitos

- Node.js 20 o superior.
- PostgreSQL 14 o superior.
- npm, pnpm o yarn.

## Instalacion

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

La API queda disponible por defecto en:

```text
http://localhost:3000/api/v1
```

Swagger queda disponible en:

```text
http://localhost:3000/docs
```

## Usuario inicial

El seed crea:

- Email: `admin@exam.local`
- Password: `replace-with-initial-admin-password`

En produccion debe definirse `SEED_ADMIN_PASSWORD`.

## Seguridad

- Todas las rutas son privadas por defecto.
- `@Public()` se usa solo en login, refresh y health check.
- JWT de acceso con expiracion corta.
- Refresh tokens aleatorios, rotativos y almacenados como hash SHA-256 con secreto servidor.
- Passwords con bcrypt.
- Roles mediante `ADMIN`, `REVIEWER`, `STUDENT`.
- Swagger con bearer auth.
- Helmet, CORS configurable, validation pipe global y filtros de error.

## Migraciones

El backend incluye las migraciones de Fase 2 y una migracion nueva:

- `20260707000000_init_exam_platform`: modelo base de examenes.
- `20260707010000_add_courses_topics`: agrega `courses`, `topics`, `questions.topic_id`, `exams.course_id` y `exams.topic_id`.

## No incluido en esta fase

- Frontend.
- Panel visual.
- Proctoring avanzado.
- Envio de correos.
- Pagos.
- Reportes avanzados.
- Integraciones externas.

## Documentacion adicional

- `docs/architecture.md`
- `docs/api.md`
- `docs/security.md`
- `docs/verification.md`

## Referencias tecnicas

- NestJS Authentication: https://docs.nestjs.com/security/authentication
- NestJS OpenAPI/Swagger: https://docs.nestjs.com/openapi/introduction
- NestJS Database techniques: https://docs.nestjs.com/techniques/database
- Prisma Client setup: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/introduction

