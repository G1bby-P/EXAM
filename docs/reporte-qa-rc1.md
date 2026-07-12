# Informe QA - Release Candidate RC1

## Veredicto

RC1 no aprobada para publicacion.

Motivos principales:

- No fue posible ejecutar pruebas funcionales end-to-end porque esta maquina no tiene Docker ni PostgreSQL disponibles.
- Recuperacion de contrasena no esta implementada.
- Aleatorizacion esta modelada en datos, pero no se aplica al iniciar el examen.
- Cierre automatico por tiempo total tiene riesgo de fallar si el envio llega al backend despues de `expiresAt`.
- No existen pruebas automatizadas reales; Jest ejecuta, pero no hay tests definidos.

Este informe no agrega funcionalidades. Es una evaluacion QA de estado y riesgos.

## Alcance probado

Solicitado:

- Login administrador.
- Login alumno.
- Recuperacion de contrasena.
- Creacion de usuarios.
- Creacion de cursos.
- Creacion de preguntas.
- Creacion de examenes.
- Importacion desde Excel.
- Exportacion Excel.
- Temporizador por pregunta.
- Temporizador total.
- Cierre automatico del examen.
- Aleatorizacion.
- Dashboard.
- Estadisticas.
- Seguridad.
- Roles.
- Docker.
- PostgreSQL.
- Nginx.
- HTTPS.

## Entorno QA

Fecha: 2026-07-08.

Limitaciones del entorno:

- `docker` no esta instalado.
- `docker compose` no esta disponible.
- `psql` no esta instalado.
- No existe PostgreSQL local disponible.
- Los builds Next.js dentro del sandbox fallan por `spawn EPERM`; al ejecutarlos fuera del sandbox pasan correctamente.

## Evidencia tecnica ejecutada

### Prisma

Primer intento:

```text
pnpm prisma:validate -> fallo por DATABASE_URL no definida.
```

Reintento con `DATABASE_URL=postgresql://replace-with-user:replace-with-password@localhost:5432/exam_platform?schema=public`:

```text
The schema at prisma\schema.prisma is valid
```

Resultado: exitoso con variables de entorno configuradas.

### Typecheck

```text
Backend: tsc --noEmit -> exitoso.
Admin: tsc --noEmit -> exitoso.
Alumno: tsc --noEmit -> exitoso.
```

### Tests backend

`pnpm test` fallo inicialmente por `spawn EPERM` del sandbox.

Reintento:

```text
pnpm exec jest --runInBand --passWithNoTests
No tests found, exiting with code 0
```

Resultado: ejecutable, pero sin cobertura real.

### Builds

Backend:

```text
pnpm build
nest build
exitoso
```

Admin:

```text
pnpm build
Compiled successfully
Generating static pages (16/16)
exitoso fuera del sandbox
```

Alumno:

```text
pnpm build
Compiled successfully
Generating static pages (7/7)
exitoso fuera del sandbox
```

### Docker/PostgreSQL

```text
docker --version -> comando no encontrado.
docker compose version -> comando no encontrado.
psql --version -> comando no encontrado.
```

Resultado: bloqueado para pruebas reales.

## Matriz de casos QA

| ID | Caso | Resultado | Evidencia | Observacion |
| --- | --- | --- | --- | --- |
| QA-001 | Login administrador | Bloqueado | UI `/login` y API `/auth/login` existen | No se pudo probar con navegador y DB real. |
| QA-002 | Login alumno | Bloqueado | UI `/login` y API `/auth/login` existen | No se pudo probar con navegador y DB real. |
| QA-003 | Recuperacion de contrasena | Fallido | No hay endpoints ni pantalla `forgot/reset password` | Funcionalidad obligatoria ausente. |
| QA-004 | Creacion de usuarios | Bloqueado | API `/users`, UI admin usuarios existen | No se pudo probar insercion real en DB. |
| QA-005 | Creacion de cursos | Bloqueado | API `/courses`, UI admin cursos existen | No se pudo probar insercion real en DB. |
| QA-006 | Creacion de preguntas | Bloqueado | API `/questions`, UI banco de preguntas existe | No se pudo probar persistencia real. |
| QA-007 | Creacion de examenes | Bloqueado | API `/exams`, UI examenes existe | No se pudo probar flujo real publicar/asignar. |
| QA-008 | Importacion desde Excel | Bloqueado | API `/questions/import/excel`, UI importacion existe | No se pudo cargar archivo real contra backend activo. |
| QA-009 | Exportacion Excel | Bloqueado | API `/exports/results.xlsx`, `/report.xlsx`, `/history.xlsx` existen | No se pudo descargar archivo real. |
| QA-010 | Temporizador por pregunta | Parcial | UI alumno tiene contador por pregunta | Es cliente-side y global por pregunta, no enforcement robusto en servidor. |
| QA-011 | Temporizador total | Parcial | Backend genera `expiresAt`; UI cuenta tiempo restante | No se pudo probar en vivo. Riesgo en envio al expirar. |
| QA-012 | Cierre automatico examen | Fallido parcial | UI llama submit al llegar a cero | Backend puede marcar intento `EXPIRED` y rechazar submit si llega tarde. |
| QA-013 | Aleatorizacion | Fallido | Campos `randomizeQuestions/randomizeOptions` existen | Inicio de intento ordena por `sortOrder`; no aplica shuffle. |
| QA-014 | Dashboard | Bloqueado | UI admin dashboard y API `/statistics/dashboard` existen | No se pudo validar datos reales/graficos. |
| QA-015 | Estadisticas | Bloqueado | API estadisticas y report CSV existen | No se pudo validar calculos con dataset real. |
| QA-016 | Seguridad examen | Bloqueado parcial | UI registra pantalla completa, pestana, copy/paste/clic derecho | No se pudo probar navegador real con API activa. |
| QA-017 | Roles | Bloqueado parcial | `JwtAuthGuard` y `RolesGuard` existen; controladores protegidos | No se pudo probar denegacion real por rol. |
| QA-018 | Docker | Bloqueado | Compose existe | Docker no esta instalado para validar `docker compose config/up`. |
| QA-019 | PostgreSQL | Bloqueado | Compose define `postgres_data` | No hay PostgreSQL local para migraciones reales. |
| QA-020 | Nginx | Bloqueado parcial | Templates HTTP/HTTPS existen | No se pudo iniciar contenedor ni validar proxy real. |
| QA-021 | HTTPS | Bloqueado parcial | Certbot y templates Let's Encrypt existen | No se pudo emitir certificado sin VPS/DNS/Docker. |

## Casos exitosos

Exitos tecnicos automatizados:

- Prisma schema valido con `DATABASE_URL`.
- Typecheck exitoso en backend.
- Typecheck exitoso en admin.
- Typecheck exitoso en alumno.
- Build backend exitoso.
- Build admin exitoso fuera del sandbox.
- Build alumno exitoso fuera del sandbox.
- Jest ejecuta en modo `--runInBand`, aunque no hay tests.

Exitos por revision estatica:

- Rutas de autenticacion existen: login, refresh, logout y me.
- Rutas CRUD principales existen: usuarios, cursos, temas, preguntas, examenes, resultados.
- Rutas de exportacion existen.
- Rutas de estadisticas existen.
- Guardas JWT/RBAC existen.
- Eventos de seguridad de examen existen en frontend y backend.
- Docker Compose productivo contiene persistencia, backups, Nginx, Certbot y monitoreo opcional.

## Casos fallidos

### QA-F01 - Recuperacion de contrasena ausente

Severidad: critica.

No existen:

- Endpoint para solicitar recuperacion.
- Endpoint para validar token.
- Endpoint para cambiar contrasena con token.
- Pantalla frontend para recuperacion.
- Integracion con correo.

Impacto:

- Usuarios bloqueados no pueden recuperar acceso.
- No cumple el caso solicitado.

### QA-F02 - Aleatorizacion no aplicada

Severidad: alta.

Hallazgo:

- `randomizeQuestions` y `randomizeOptions` se guardan en examen/version.
- Al iniciar intento, backend carga preguntas con `orderBy: sortOrder`.
- No se encontro logica de shuffle para preguntas ni opciones.
- UI de creacion de examen no expone controles de aleatorizacion.

Impacto:

- Todos los alumnos reciben el mismo orden.
- No cumple el caso solicitado.

### QA-F03 - Cierre automatico puede no generar nota

Severidad: alta.

Hallazgo:

- El frontend intenta enviar al llegar a cero.
- El backend rechaza operaciones si `expiresAt <= now` y marca el intento como `EXPIRED`.

Impacto:

- Si el submit automatico llega despues del limite por latencia, el examen puede quedar expirado sin nota.

### QA-F04 - Sin pruebas automatizadas reales

Severidad: alta.

Hallazgo:

- Jest finaliza con `No tests found`.
- No hay pruebas unitarias, integracion ni e2e.

Impacto:

- La RC1 no tiene red de seguridad automatizada.

## Riesgos

- No se pudo ejecutar flujo completo admin-alumno por falta de Docker/PostgreSQL.
- Docker Compose, Nginx y HTTPS estan preparados pero no probados en servidor real.
- La importacion Excel y exportacion Excel no fueron probadas contra API viva.
- Los calculos de estadisticas no fueron validados con datos reales.
- Seguridad del examen depende de APIs del navegador; requiere prueba manual en Chrome/Edge/Firefox.
- Temporizador por pregunta vive en cliente; puede ser manipulado si no se refuerza en servidor.
- `FILE_UPLOAD` esta modelado, pero el alumno muestra mensaje de no soporte de carga real de archivos.
- El uso de localStorage para tokens expone riesgo ante XSS; Helmet ayuda, pero no reemplaza cookies httpOnly.

## Correcciones aplicadas

No se aplicaron correcciones funcionales durante esta fase QA.

Acciones realizadas:

- Se ejecuto validacion tecnica automatizable.
- Se identificaron fallos y bloqueos.
- Se genero este informe QA RC1.

Motivo:

- La fase indica no desarrollar nuevas funcionalidades.
- Corregir recuperacion de contrasena, aleatorizacion robusta y cierre automatico confiable requiere desarrollo funcional o cambios de comportamiento.

## Recomendacion QA

No publicar RC1 todavia.

Para aprobar RC1 deben completarse como minimo:

1. Implementar recuperacion de contrasena.
2. Aplicar aleatorizacion real de preguntas/opciones al iniciar intento.
3. Ajustar cierre automatico para que siempre genere resultado aun si el submit llega al limite.
4. Agregar pruebas automatizadas minimas para auth, usuarios, cursos, preguntas, examenes, resultados y exportaciones.
5. Ejecutar `docker compose up -d --build` en VPS o maquina con Docker.
6. Ejecutar migraciones reales en PostgreSQL.
7. Probar flujo completo:
   - login admin.
   - crear usuario alumno.
   - crear curso.
   - crear pregunta.
   - crear examen.
   - publicar/asignar.
   - login alumno.
   - iniciar/responder/finalizar.
   - validar nota.
   - exportar Excel.
8. Emitir y validar HTTPS real con Let's Encrypt.
9. Probar backup y restore.

## Estado final

Estado QA: RC1 bloqueada.

Tipo de entrega: informe QA y paquete fuente actualizado.

