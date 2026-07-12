# Verificacion de produccion web

## Verificado por revision de archivos

- Docker Compose contiene servicios para PostgreSQL, migracion, seed opcional, API, admin, alumno, Nginx, Certbot y backups.
- Nginx queda configurado como reverse proxy para `ADMIN_HOST`, `STUDENT_HOST` y `API_HOST`.
- Existe plantilla HTTP para validacion ACME.
- Existe plantilla HTTPS para Let's Encrypt.
- Certbot queda configurado con volumen persistente `letsencrypt_data`.
- PostgreSQL usa volumen persistente `postgres_data`.
- API usa volumen persistente `app_storage`.
- Backups automaticos de PostgreSQL quedan configurados en `postgres-backup`.
- Scripts de backup y restore existen para base de datos y archivos.
- Docker logging usa rotacion `json-file`.
- Nginx envia logs a stdout/stderr.
- Monitoreo opcional queda definido en `docker-compose.monitoring.yml`.
- Prometheus, Grafana, Node Exporter, cAdvisor y Blackbox Exporter tienen configuracion base.
- `.env.production.example` contiene variables productivas para dominios, HTTPS, CORS, backups, logs y monitoreo.
- `docs/despliegue-vps.md` contiene el procedimiento paso a paso para VPS/cloud.

## Verificado previamente en estabilizacion tecnica

- `pnpm-lock.yaml` generado para backend, admin y alumno.
- Dependencias instaladas correctamente usando `NODE_OPTIONS=--use-system-ca`.
- Prisma Client generado correctamente.
- `prisma validate` ejecutado correctamente.
- Build real del backend ejecutado correctamente.
- Typecheck del backend ejecutado correctamente.
- Build real del panel administrador ejecutado correctamente.
- Typecheck del panel administrador ejecutado correctamente.
- Build real del modulo alumno ejecutado correctamente.
- Typecheck del modulo alumno ejecutado correctamente.

## Pendiente de verificar en VPS

Esta computadora no tiene Docker disponible, por lo que deben verificarse en un servidor real:

- `docker compose --env-file .env.production config`.
- `docker compose --env-file .env.production up -d --build`.
- Migraciones reales contra PostgreSQL.
- Emision real de certificados Let's Encrypt.
- Renovacion de certificados.
- URLs HTTPS:
  - `https://ADMIN_HOST`
  - `https://STUDENT_HOST`
  - `https://API_HOST/api/v1/health`
- Backup automatico.
- Restore de base de datos.
- Backup y restore de archivos.
- Monitoreo Prometheus/Grafana.

## Comandos de validacion en servidor

```bash
cd /opt/exam-platform
docker compose --env-file .env.production config
./operations/init-letsencrypt.sh
./operations/healthcheck.sh
./operations/backup-postgres.sh
./operations/backup-files.sh
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

