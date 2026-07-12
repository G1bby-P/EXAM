# Fase 4 - Panel del administrador

Panel administrativo construido con Next.js, TypeScript y CSS Modules/global CSS. Esta fase no incluye el examen del alumno ni rutas para presentar examenes.

## Stack

- Next.js App Router
- React
- TypeScript
- CSS Modules/global CSS
- Lucide React para iconografia
- API REST del backend de Fase 3

## Vistas incluidas

- Login administrativo
- Tablero
- Usuarios
- Roles
- Cursos
- Temas
- Preguntas
- Alternativas
- Examenes
- Constructor administrativo de examenes
- Publicacion de examenes
- Asignacion de examenes
- Resultados
- Revision manual de respuestas
- Publicacion de resultados
- Auditoria
- Configuracion y health check

## Variables de entorno

Copiar `.env.example` a `.env`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

## Instalacion

```bash
npm install
npm run dev
```

La app queda disponible por defecto en:

```text
http://localhost:3000
```

Si el backend NestJS usa el mismo puerto, ejecutar el panel en otro puerto:

```bash
npm run dev -- -p 3001
```

## Credenciales de desarrollo

El backend de Fase 3 crea por seed:

- `admin@exam.local`
- `replace-with-initial-admin-password`

## Decisiones de arquitectura

- Todas las rutas administrativas viven bajo `/admin`.
- La ruta `/login` es la unica pantalla publica del panel.
- El panel consume `NEXT_PUBLIC_API_BASE_URL`.
- Los tokens se almacenan en `localStorage` para esta fase; en una fase de hardening puede migrarse a cookies `HttpOnly` mediante BFF o middleware server-side.
- El panel permite gestionar examenes, pero no contiene la experiencia para que el alumno presente un examen.

## Referencias tecnicas

- Next.js Project Structure: https://nextjs.org/docs/app/getting-started/project-structure
- Next.js Environment Variables: https://nextjs.org/docs/pages/guides/environment-variables
- Next.js CSS Modules: https://nextjs.org/docs/14/app/building-your-application/styling/css-modules
- Lucide React: https://lucide.dev/guide/react

