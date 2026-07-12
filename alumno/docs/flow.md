# Flujo del alumno

## Login

1. El alumno ingresa correo y contrasena en `/login`.
2. El modulo consume `POST /auth/login`.
3. Guarda access token y refresh token.
4. Consulta `GET /auth/me`.
5. Valida rol `STUDENT`.
6. Redirige a `/student`.

## Inicio del examen

1. El alumno ve examenes asignados con `GET /exams/available/me`.
2. Selecciona un examen.
3. El modulo abre `/student/exams/:assignmentId`.
4. Se crea el intento con `POST /exam-assignments/:assignmentId/attempts`.
5. El backend devuelve preguntas versionadas sin respuestas correctas.
6. El modulo guarda el intento en `localStorage` para tolerar recargas.

## Durante el examen

1. Se muestra una pregunta a la vez.
2. El temporizador general usa `attempt.expiresAt`.
3. El temporizador por pregunta usa `NEXT_PUBLIC_SECONDS_PER_QUESTION`.
4. Cada respuesta se guarda:
   - por intervalo,
   - al cambiar de pregunta,
   - al ocultar la pestana,
   - antes de finalizar.
5. Al agotarse el tiempo de pregunta, se guarda y se avanza automaticamente.
6. Al agotarse el tiempo general, se guarda y se finaliza automaticamente.

## Finalizacion

1. El alumno puede finalizar manualmente.
2. Si el tiempo general llega a cero, se finaliza automaticamente.
3. Si el tiempo de la ultima pregunta llega a cero, se finaliza automaticamente.
4. El modulo llama `POST /exam-attempts/:attemptId/submit`.
5. Limpia el intento local.
6. Redirige a resultados.

## Resultados

1. `/student/results` consulta `GET /results/me`.
2. Si viene de un envio reciente, consulta tambien `GET /results/:id`.
3. Muestra estado, porcentaje, puntaje y aprobacion cuando el backend lo permite.
