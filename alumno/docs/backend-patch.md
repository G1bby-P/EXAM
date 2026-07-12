# Parche backend aplicado en Fase 5

Archivo modificado:

- `backend/src/modules/exams/exams.service.ts`

## Motivo

El endpoint `POST /exam-assignments/:assignmentId/attempts` devolvia preguntas versionadas completas. Ese objeto podia incluir:

- `correctAnswerSnapshot`
- `explanation`

Ambos campos no deben llegar al navegador del alumno durante el examen.

## Cambio

Antes de retornar el intento iniciado, el backend elimina esos campos de cada pregunta:

- `correctAnswerSnapshot`
- `explanation`

## Alcance

El cambio es minimo y pertenece al modulo del alumno porque protege el flujo de presentacion del examen.

## Pendiente recomendado

Crear un DTO especifico de respuesta para `startAttempt`, con selects explicitos en Prisma, para evitar que futuros campos sensibles se expongan accidentalmente.

