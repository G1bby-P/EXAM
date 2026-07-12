# API principal

Todas las rutas usan el prefijo configurable `API_PREFIX`, por defecto `/api/v1`.

## Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Usuarios y roles

- `GET /users`
- `POST /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `PATCH /users/:id/roles`
- `DELETE /users/:id`
- `GET /roles`

## Cursos y temas

- `GET /courses`
- `POST /courses`
- `GET /courses/:id`
- `PATCH /courses/:id`
- `DELETE /courses/:id`
- `GET /topics`
- `POST /topics`
- `GET /topics/:id`
- `PATCH /topics/:id`
- `DELETE /topics/:id`

## Preguntas y alternativas

- `GET /questions`
- `POST /questions`
- `GET /questions/:id`
- `PATCH /questions/:id`
- `DELETE /questions/:id`
- `POST /questions/:id/alternatives`
- `PATCH /questions/alternatives/:id`
- `DELETE /questions/alternatives/:id`

## Examenes

- `GET /exams`
- `POST /exams`
- `GET /exams/available/me`
- `GET /exams/:id`
- `PATCH /exams/:id`
- `DELETE /exams/:id`
- `POST /exams/:id/sections`
- `POST /exams/:id/questions`
- `POST /exams/:id/publish`
- `POST /exams/:id/assign`
- `POST /exam-assignments/:assignmentId/attempts`
- `PATCH /exam-attempts/:attemptId/questions/:questionId/answer`
- `POST /exam-attempts/:attemptId/submit`
- `POST /exam-attempts/:attemptId/security-events`
- `GET /exam-attempts/:attemptId/security-events`

## Resultados

- `GET /results`
- `GET /results/me`
- `GET /results/:id`
- `PATCH /results/answers/:answerId/review`
- `POST /results/:id/publish`

## Logs y auditoria

- `GET /audit/logs`
- `GET /logs`
- `GET /health`

La especificacion interactiva completa se genera en Swagger.
