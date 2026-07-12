# Reporte de preparacion web para produccion

## Objetivo

Preparar el proyecto para publicarse en Internet como aplicacion web accesible desde navegador mediante URLs HTTPS.

No se agregaron funcionalidades de negocio. Los cambios son de infraestructura, operacion, documentacion y configuracion productiva.

## Cambios realizados

1. Docker Compose productivo actualizado:
   - Puertos `80` y `443`.
   - PostgreSQL persistente.
   - Volumen persistente `app_storage`.
   - Certbot para Let's Encrypt.
   - Servicio automatico `postgres-backup`.
   - Rotacion de logs Docker.

2. Nginx actualizado:
   - Reverse proxy por host.
   - Soporte ACME challenge.
   - Plantilla HTTPS con certificados Let's Encrypt.
   - Cabeceras basicas de seguridad.
   - Logs JSON a stdout/stderr para integracion con Docker.

3. HTTPS preparado:
   - Script `operations/init-letsencrypt.sh`.
   - Script `operations/renew-certificates.sh`.
   - Uso de staging para pruebas.
   - Soporte de certificado real con `LETSENCRYPT_STAGING=0`.

4. Variables de entorno productivas:
   - Dominios reales.
   - Email Let's Encrypt.
   - Secretos JWT.
   - CORS HTTPS.
   - Retencion y frecuencia de backups.
   - Credenciales Grafana.

5. Persistencia:
   - `postgres_data` para base de datos.
   - `app_storage` para archivos del backend.
   - `letsencrypt_data` para certificados.
   - `certbot_www` para validacion ACME.

6. Backups y restauracion:
   - Backup automatico de PostgreSQL.
   - Backup manual de PostgreSQL.
   - Restore de PostgreSQL `.sql` y `.sql.gz`.
   - Backup manual de archivos persistentes.
   - Restore de archivos persistentes.

7. Seguridad de servidor:
   - Manual con UFW.
   - Manual con Fail2ban.
   - Recomendacion de llaves SSH.
   - PostgreSQL no expuesto.
   - Prometheus/Grafana restringidos a localhost.

8. Logs y monitoreo:
   - Rotacion de logs por contenedor.
   - Prometheus opcional.
   - Grafana opcional.
   - Node Exporter.
   - cAdvisor.
   - Blackbox Exporter.

9. Documentacion:
   - `README.md` actualizado a produccion web.
   - `docs/manual-tecnico.md` actualizado.
   - `docs/despliegue-vps.md` creado.
   - `cloud/README.md` actualizado.

## Archivos principales

- `docker-compose.yml`
- `docker-compose.monitoring.yml`
- `.env.production.example`
- `nginx/nginx.conf`
- `nginx/templates/default.conf.template`
- `nginx/templates/default.http.conf.template.example`
- `nginx/templates/default.https.conf.template.example`
- `nginx/snippets/ssl.conf`
- `operations/init-letsencrypt.sh`
- `operations/renew-certificates.sh`
- `operations/backup-postgres.sh`
- `operations/restore-postgres.sh`
- `operations/backup-files.sh`
- `operations/restore-files.sh`
- `operations/healthcheck.sh`
- `monitoring/prometheus.yml`
- `monitoring/blackbox.yml`
- `monitoring/grafana/provisioning/datasources/prometheus.yml`

## Pendiente de verificacion en servidor real

Esta computadora no tiene Docker disponible, por lo que deben verificarse en un VPS:

- `docker compose config`.
- `docker compose up -d --build`.
- Emision real de certificados Let's Encrypt.
- Acceso HTTPS a dominios reales.
- Migraciones contra PostgreSQL real.
- Backup automatico.
- Restore en ambiente de prueba.
- Monitoreo Prometheus/Grafana.

## Comandos de validacion en VPS

```bash
cd /opt/exam-platform
docker compose --env-file .env.production config
./operations/init-letsencrypt.sh
./operations/healthcheck.sh
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.monitoring.yml up -d
./operations/backup-postgres.sh
./operations/backup-files.sh
```

