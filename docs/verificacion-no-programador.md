# Verificacion para persona no programadora

## 1. Que si quedo preparado

El proyecto quedo preparado como aplicacion web para alojarse en un servidor cloud o VPS.

Incluye:

- Backend.
- Panel administrador.
- Modulo del alumno.
- Base de datos PostgreSQL.
- Docker Compose.
- Nginx como reverse proxy.
- HTTPS con Let's Encrypt.
- Variables de entorno de produccion.
- Almacenamiento persistente para base de datos.
- Almacenamiento persistente para archivos.
- Backups automaticos.
- Scripts de restauracion.
- Logs con rotacion.
- Monitoreo opcional.
- Manual paso a paso para servidor cloud.

## 2. Que no se pudo verificar en esta computadora

No se pudo verificar:

- Docker Compose real.
- Certificados Let's Encrypt reales.
- Migraciones en PostgreSQL real.
- URLs HTTPS reales.
- Backups automaticos ejecutandose.
- Restore real.
- Monitoreo real.

Motivo: esta computadora no tiene Docker disponible. La verificacion final debe hacerse en un VPS o servidor cloud.

## 3. Como se usara el sistema

Los usuarios no instalaran nada.

Entraran desde navegador a URLs como:

```text
https://admin.midominio.com
https://alumno.midominio.com
```

La API quedara disponible en:

```text
https://api.midominio.com/api/v1/health
```

## 4. Que debe contratarse o tenerse antes de publicar

- Un dominio.
- Un VPS o servidor cloud.
- Acceso SSH al servidor.
- DNS apuntando al servidor.
- Docker instalado en el servidor.
- Puertos 80 y 443 abiertos.
- Backups del proveedor cloud activados.

## 5. Archivo principal para seguir

El paso a paso esta en:

```text
docs/despliegue-vps.md
```

## 6. Credenciales de prueba

Estas credenciales se crean solo si se ejecuta el seed.

Importante: las contrasenas no vienen fijas en el proyecto. Deben escribirse primero en el archivo privado `.env.production`:

```text
SEED_ADMIN_PASSWORD=escribir-una-contrasena-segura
SEED_TEST_ADMIN_PASSWORD=escribir-una-contrasena-para-admin-test
SEED_TEST_STUDENT_PASSWORD=escribir-una-contrasena-para-alumno-test
```

Despues se ejecuta:

```bash
docker compose --env-file .env.production --profile seed up api-seed
```

Los accesos quedan asi:

```text
Administrador inicial:
admin@exam.local
contrasena: valor de SEED_ADMIN_PASSWORD

Administrador de prueba:
admin@test.com
contrasena: valor de SEED_TEST_ADMIN_PASSWORD

Alumno de prueba:
alumno@test.com
contrasena: valor de SEED_TEST_STUDENT_PASSWORD
```

Antes de produccion real, cambiar o eliminar estas credenciales.

## 7. Checklist antes de usar en produccion

- DNS configurado.
- HTTPS real funcionando.
- `SWAGGER_ENABLED=false`.
- Secretos reales configurados.
- Login administrador probado.
- Login alumno probado.
- Backup probado.
- Restore probado en servidor de prueba.
- Monitoreo funcionando.
- Logs revisados.
- Usuarios de prueba eliminados o con contrasenas cambiadas.


