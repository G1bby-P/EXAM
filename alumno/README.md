# Fase 5 - Modulo del alumno

Modulo del alumno construido con Next.js, TypeScript y CSS Modules/global CSS. Esta fase no modifica el panel administrador.

## Stack

- Next.js App Router
- React
- TypeScript
- CSS Modules/global CSS
- Lucide React
- API REST del backend de Fase 3

## Funciones incluidas

- Login del alumno.
- Listado de examenes asignados.
- Inicio del examen.
- Temporizador general del examen.
- Temporizador por pregunta.
- Guardado automatico por intervalo.
- Guardado al cambiar de pregunta.
- Guardado al ocultar la pestana.
- Paso automatico a la siguiente pregunta.
- Finalizacion automatica al agotarse el tiempo general.
- Finalizacion automatica al agotarse el tiempo de la ultima pregunta.
- Resultados del alumno.

## Variables de entorno

Copiar `.env.example` a `.env`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_SECONDS_PER_QUESTION=60
NEXT_PUBLIC_AUTOSAVE_INTERVAL_SECONDS=10
```

## Instalacion

```bash
npm install
npm run dev -- -p 3002
```

La app queda disponible por defecto en:

```text
http://localhost:3002
```

## Rutas

- `/login`: login del alumno.
- `/student`: examenes asignados.
- `/student/exams/:assignmentId`: presentacion del examen.
- `/student/results`: resultados.

## Seguridad

El modulo valida que el usuario autenticado tenga rol `STUDENT`. Si la cuenta no tiene ese rol, limpia la sesion local.

Se aplico un parche minimo al backend de Fase 3 para que `startAttempt` no exponga `correctAnswerSnapshot` ni `explanation` en las preguntas enviadas al alumno.

## Limitacion conocida

El temporizador general es controlado por el backend mediante `expiresAt`. El temporizador por pregunta se controla en frontend porque la base de datos y el backend actuales no tienen una regla persistida por pregunta. Para mayor rigor en produccion, una fase futura deberia agregar tiempo por pregunta al modelo de examen publicado y validarlo tambien en servidor.

## Referencias tecnicas

- Next.js Project Structure: https://nextjs.org/docs/app/getting-started/project-structure
- Next.js Environment Variables: https://nextjs.org/docs/pages/guides/environment-variables
- Next.js CSS Modules: https://nextjs.org/docs/14/app/building-your-application/styling/css-modules
- Lucide React: https://lucide.dev/guide/react
