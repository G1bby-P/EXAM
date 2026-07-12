# Fase 2 - Base de datos

Esta entrega contiene un diseno de base de datos PostgreSQL con Prisma para una plataforma de examenes. No incluye backend, controladores, servicios ni funcionalidades de API.

## Contenido

- `prisma/schema.prisma`: modelos Prisma, enums y relaciones.
- `prisma.config.ts`: configuracion Prisma 7 para migraciones y datasource.
- `prisma/migrations/20260707000000_init_exam_platform/migration.sql`: migracion inicial SQL para PostgreSQL.
- `prisma/seed.ts`: seed idempotente con roles, usuarios base, preguntas, examen publicado y asignacion de ejemplo.
- `docs/database.md`: especificacion de tablas, relaciones, indices y restricciones.
- `docs/er-diagram.md`: diagrama ER en Mermaid.
- `docs/verification.md`: verificacion realizada y comandos pendientes.

## Requisitos

- PostgreSQL 14 o superior.
- Node.js 20 o superior.
- npm, pnpm o yarn.

## Uso

1. Copiar `.env.example` a `.env`.
2. Ajustar `DATABASE_URL`.
3. Instalar dependencias.
4. Ejecutar migraciones.
5. Ejecutar seed.

```bash
npm install
npm run prisma:generate
npm run db:migrate
npm run db:seed
```

Para desarrollo local con una base vacia:

```bash
npm run db:dev
```

## Usuarios del seed

El seed crea estos usuarios:

- `admin@exam.local`
- `reviewer@exam.local`
- `student@exam.local`

La contrasena por defecto es `replace-with-initial-admin-password`. En entornos reales debe definirse `SEED_PASSWORD` antes de ejecutar el seed.

## Decisiones registradas

- PostgreSQL es la fuente de verdad.
- Prisma 7 se usa como ORM y sistema de migraciones.
- La URL de conexion vive en `prisma.config.ts`, no en `schema.prisma`.
- Prisma Client usa el adapter PostgreSQL `@prisma/adapter-pg`.
- Los IDs son UUID.
- Los nombres fisicos de tablas y columnas usan `snake_case`.
- Los modelos Prisma usan `PascalCase` y campos `camelCase`.
- Los examenes publicados se versionan mediante `exam_versions`, `exam_version_sections` y `exam_version_questions`.
- Los intentos apuntan a una version inmutable del examen, no al borrador editable.
- Las respuestas se guardan por pregunta versionada.
- Las acciones criticas tienen soporte de auditoria.
- No se implemento backend en esta fase.

