# Seguridad del examen del alumno

## Comportamiento

La pantalla `src/app/student/exams/[assignmentId]/page.tsx` exige pantalla completa antes de permitir responder preguntas. Si el alumno sale de pantalla completa, la vista de preguntas se reemplaza por una compuerta de seguridad hasta que vuelva a activar el modo seguro.

## Eventos registrados

- Entrada y salida de pantalla completa.
- Cambio de pestana o retorno a la pestana.
- Perdida y recuperacion de foco de ventana.
- Intentos de copiar, pegar y cortar.
- Intentos de clic derecho.
- Atajos bloqueados de portapapeles, impresion e inspeccion.

Cada evento se envia a:

```http
POST /exam-attempts/:attemptId/security-events
```

El envio usa `keepalive` para mejorar la entrega cuando la pagina queda en segundo plano. Los eventos repetidos del mismo tipo se reducen con una ventana de 1.5 segundos para evitar ruido excesivo.

## Metadatos

Se registran metadatos no sensibles:

- Estado de pantalla completa.
- Estado de visibilidad del documento.
- Tamano del viewport.
- Pregunta actual.
- Indice de pregunta.

## Limitaciones

El navegador no permite bloquear absolutamente capturas de pantalla, extensiones, herramientas del sistema ni todas las teclas reservadas. Esta capa aplica prevencion de mejor esfuerzo y deja evidencia auditable para revision academica.
