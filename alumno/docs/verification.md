# Verificacion de Fase 5

## Verificado localmente

- Se creo un proyecto Next.js independiente para el modulo del alumno.
- Se incluyo login.
- Se incluyo listado de examenes asignados.
- Se incluyo inicio del examen.
- Se incluyo temporizador general.
- Se incluyo temporizador por pregunta.
- Se incluyo guardado automatico por intervalo.
- Se incluyo guardado al cambiar de pregunta y al ocultar la pestana.
- Se incluyo paso automatico.
- Se incluyo finalizacion automatica.
- Se incluyo vista de resultados.
- Se aplico parche backend para no exponer respuestas correctas al alumno.
- `package.json` y `tsconfig.json` son JSON validos.
- No se encontraron imports backend en `src`.
- No se encontraron caracteres no ASCII inesperados.
- El entregable contiene 37 archivos.

## Limitacion del entorno

No se pudo instalar dependencias ni ejecutar `npm run typecheck` o `npm run build` porque el entorno no tiene `npm`/`npx` disponible.

## Comandos a ejecutar en entorno con Node/npm funcional

```bash
npm install
npm run typecheck
npm run build
npm run dev -- -p 3002
```

## Resultado esperado

- `/login` permite ingresar con una cuenta `STUDENT`.
- `/student` muestra examenes asignados.
- `/student/exams/:assignmentId` inicia y presenta el examen.
- Las respuestas se guardan automaticamente.
- El examen avanza automaticamente por pregunta.
- El examen finaliza automaticamente al terminar el tiempo general.
- `/student/results` muestra resultados.
