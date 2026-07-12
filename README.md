# Plataforma web de examenes

Aplicacion web para administrar examenes, banco de preguntas, modulo del alumno, resultados, estadisticas, exportaciones y auditoria. Esta preparada para publicarse en Internet mediante Docker Compose, Nginx y HTTPS.

## Alcance

- Docker Compose para ejecutar todos los servicios.
- Nginx como reverse proxy.
- HTTPS con Let's Encrypt y Certbot.
- Variables de entorno productivas.
- PostgreSQL persistente.
- Volumen persistente para archivos.
- Backups automaticos de PostgreSQL.
- Scripts de backup y restauracion.
- Logs con rotacion.
- Monitoreo opcional con Prometheus y Grafana.
- Manual paso a paso para VPS o servidor cloud.

## Servicios

| Servicio | Ruta | Puerto interno | Exposicion |
| --- | --- | --- | --- |
| API NestJS | `./backend` | `3000` | Nginx |
| Panel administrador | `./admin` | `3000` | Nginx |
| Modulo alumno | `./alumno` | `3000` | Nginx |
| PostgreSQL | Docker Compose | `5432` | Solo red interna |
| Nginx | `./nginx` | `80`, `443` | Internet |
| Certbot | Docker Compose | N/A | Perfil `certbot` |
| Postgres backup | Docker Compose | N/A | Solo red interna |

## Dominios recomendados

Configurar registros DNS apuntando a la IP publica del servidor:

- `admin.example.com`: panel administrador.
- `alumno.example.com`: modulo del alumno.
- `api.example.com`: API publica.

Los valores reales se configuran en `.env.production`.

## Despliegue rapido

```bash
cd .
cp .env.production.example .env.production
nano .env.production
chmod +x operations/*.sh
./operations/init-letsencrypt.sh
./operations/healthcheck.sh
```

Para monitoreo:

```bash
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

## Backups

Backup automatico:

- Servicio: `postgres-backup`.
- Carpeta: `backups/postgres`.
- Frecuencia: `BACKUP_INTERVAL_SECONDS`.
- Retencion: `BACKUP_RETENTION_DAYS`.

Backup manual:

```bash
./operations/backup-postgres.sh
./operations/backup-files.sh
```

Restore:

```bash
./operations/restore-postgres.sh backups/postgres/exam-platform-YYYYMMDDTHHMMSSZ.sql.gz
./operations/restore-files.sh backups/files/app-storage-YYYYMMDDTHHMMSSZ.tgz
```

## Documentacion

- [Manual de despliegue VPS](docs/despliegue-vps.md)
- [Manual tecnico](docs/manual-tecnico.md)
- [Manual del administrador](docs/manual-administrador.md)
- [Manual del alumno](docs/manual-alumno.md)
- [Credenciales de prueba](docs/credenciales-prueba.md)
- [Verificacion](docs/verification.md)
- [Verificacion para persona no programadora](docs/verificacion-no-programador.md)
- [Informe QA RC1](docs/reporte-qa-rc1.md)
- [Cloud](cloud/README.md)
- [AWS](cloud/aws/README.md)
- [Azure](cloud/azure/README.md)
- [Google Cloud](cloud/gcp/README.md)
- [Despliegue en Google Cloud Compute Engine](docs/despliegue-google-cloud.md)
- [DigitalOcean](cloud/digitalocean/README.md)

## Checklist de produccion

- DNS configurado.
- Puertos 80 y 443 abiertos.
- Firewall activo.
- Secrets reales y rotados.
- `SWAGGER_ENABLED=false`.
- `TRUST_PROXY=true` detras de Nginx.
- PostgreSQL no expuesto a Internet.
- TLS activo con certificado real.
- Backups automaticos activos.
- Restore probado.
- Logs revisados.
- Monitoreo activo.
- Health checks activos.
- Usuarios de prueba eliminados o contrasenas cambiadas.


