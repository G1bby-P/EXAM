# Manual de despliegue en VPS o servidor cloud

Este manual publica la plataforma como aplicacion web. No se instala ningun programa en las computadoras de los usuarios. Los usuarios entran desde navegador usando URLs publicas.

## 1. Requisitos del servidor

Proveedor recomendado:

- AWS EC2.
- Azure Virtual Machine.
- Google Compute Engine.
- DigitalOcean Droplet.

Servidor minimo para piloto:

- Ubuntu Server 24.04 LTS.
- 2 vCPU.
- 4 GB RAM.
- 50 GB SSD.

Servidor recomendado para produccion inicial:

- 4 vCPU.
- 8 GB RAM.
- 100 GB SSD.
- Backups del proveedor activados.

Puertos publicos necesarios:

- `22`: SSH, restringido por IP si es posible.
- `80`: HTTP para validacion Let's Encrypt y redireccion.
- `443`: HTTPS para usuarios.

## 2. DNS

Crear registros `A` apuntando a la IP publica del servidor:

```text
admin.example.com  -> IP_PUBLICA_DEL_SERVIDOR
alumno.example.com -> IP_PUBLICA_DEL_SERVIDOR
api.example.com    -> IP_PUBLICA_DEL_SERVIDOR
```

Esperar propagacion DNS antes de emitir certificados.

Verificar desde una terminal:

```bash
dig +short admin.example.com
dig +short alumno.example.com
dig +short api.example.com
```

## 3. Acceso seguro al servidor

Entrar por SSH:

```bash
ssh root@IP_PUBLICA_DEL_SERVIDOR
```

Crear usuario operador:

```bash
adduser deploy
usermod -aG sudo deploy
```

Copiar llave SSH al usuario `deploy` y volver a entrar:

```bash
ssh deploy@IP_PUBLICA_DEL_SERVIDOR
```

Actualizar sistema:

```bash
sudo apt update
sudo apt upgrade -y
```

## 4. Firewall y proteccion basica

Configurar UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Instalar Fail2ban:

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
sudo systemctl status fail2ban
```

Recomendaciones adicionales:

- Deshabilitar login SSH por contrasena cuando las llaves SSH esten probadas.
- No exponer PostgreSQL a Internet.
- No exponer Prometheus ni Grafana publicamente sin VPN o proxy autenticado.
- Mantener actualizaciones de seguridad activas.

## 5. Instalar Docker y Docker Compose

Instalar dependencias:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Agregar repositorio oficial de Docker:

```bash
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

Instalar Docker Engine, Buildx y Compose:

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Permitir uso de Docker al usuario `deploy`:

```bash
sudo usermod -aG docker deploy
exit
```

Entrar de nuevo por SSH y verificar:

```bash
docker --version
docker compose version
docker run hello-world
```

Referencia oficial:

- Docker recomienda instalar desde su repositorio `apt` para Ubuntu.
- Docker Compose se instala como plugin `docker-compose-plugin`.

## 6. Subir el proyecto al servidor

Crear carpeta:

```bash
sudo mkdir -p /opt/exam-platform
sudo chown -R deploy:deploy /opt/exam-platform
```

Subir el ZIP al servidor y descomprimir:

```bash
cd /opt/exam-platform
unzip proyecto-completo-estabilizado.zip
```

La carpeta productiva debe quedar en:

```text
/opt/exam-platform
```

Dar permisos a scripts:

```bash
cd /opt/exam-platform
chmod +x operations/*.sh
```

## 7. Configurar variables de entorno

Crear archivo privado:

```bash
cp .env.production.example .env.production
nano .env.production
```

Cambiar como minimo:

```text
POSTGRES_PASSWORD
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
SEED_ADMIN_PASSWORD
SEED_TEST_ADMIN_PASSWORD
SEED_TEST_STUDENT_PASSWORD
ADMIN_HOST
STUDENT_HOST
API_HOST
CERT_NAME
CORS_ORIGINS
LETSENCRYPT_EMAIL
GRAFANA_ADMIN_PASSWORD
```

Ejemplo:

```text
ADMIN_HOST=admin.midominio.com
STUDENT_HOST=alumno.midominio.com
API_HOST=api.midominio.com
CERT_NAME=admin.midominio.com
CORS_ORIGINS=https://admin.midominio.com,https://alumno.midominio.com,https://api.midominio.com
LETSENCRYPT_EMAIL=soporte@midominio.com
```

Generar secretos fuertes:

```bash
openssl rand -base64 64
openssl rand -base64 64
openssl rand -base64 32
```

Antes de produccion:

```text
SWAGGER_ENABLED=false
LETSENCRYPT_STAGING=0
CERTBOT_FORCE_RENEWAL=1
```

## 8. Primer despliegue con HTTPS

Primero probar con Let's Encrypt staging. Verificar en `.env.production`:

```text
LETSENCRYPT_STAGING=1
CERTBOT_FORCE_RENEWAL=0
ALLOW_INSECURE_HTTPS=1
```

Ejecutar:

```bash
cd /opt/exam-platform
./operations/init-letsencrypt.sh
```

Si termina correctamente, editar `.env.production`:

```text
LETSENCRYPT_STAGING=0
CERTBOT_FORCE_RENEWAL=1
ALLOW_INSECURE_HTTPS=0
```

Emitir certificado real:

```bash
./operations/init-letsencrypt.sh
```

Validar:

```bash
./operations/healthcheck.sh
```

Abrir en navegador:

```text
https://admin.midominio.com
https://alumno.midominio.com
https://api.midominio.com/api/v1/health
```

## 9. Comandos de operacion diaria

Ver servicios:

```bash
docker compose --env-file .env.production ps
```

Ver logs:

```bash
docker compose --env-file .env.production logs -f api
docker compose --env-file .env.production logs -f nginx
docker compose --env-file .env.production logs -f postgres
```

Reiniciar:

```bash
docker compose --env-file .env.production restart
```

Actualizar despues de subir nueva version:

```bash
docker compose --env-file .env.production up -d --build
```

Crear usuarios de prueba:

```bash
docker compose --env-file .env.production --profile seed up api-seed
```

Las contrasenas de esos usuarios no son fijas. Son exactamente las que se hayan escrito en `.env.production`:

```text
admin@exam.local -> SEED_ADMIN_PASSWORD
admin@test.com -> SEED_TEST_ADMIN_PASSWORD
alumno@test.com -> SEED_TEST_STUDENT_PASSWORD
```

Si cambia una contrasena en `.env.production`, ejecutar nuevamente el comando de `api-seed` para actualizar el hash en PostgreSQL.

## 10. Renovacion de certificados

Probar renovacion:

```bash
./operations/renew-certificates.sh
```

Programar renovacion diaria con cron:

```bash
crontab -e
```

Agregar:

```cron
15 3 * * * cd /opt/exam-platform && ./operations/renew-certificates.sh >> backups/certbot-renew.log 2>&1
```

## 11. Backups automaticos

El servicio `postgres-backup` crea un backup comprimido cada 24 horas en:

```text
backups/postgres
```

Variables:

```text
BACKUP_INTERVAL_SECONDS=86400
BACKUP_RETENTION_DAYS=14
```

Crear backup manual:

```bash
./operations/backup-postgres.sh
./operations/backup-files.sh
```

Copiar backups fuera del servidor:

```bash
rsync -av backups/ usuario@servidor-backup:/ruta/segura/exam-platform/
```

En produccion real, activar tambien snapshots o backups administrados del proveedor cloud.

## 12. Restauracion

Restaurar base de datos:

```bash
docker compose --env-file .env.production stop api admin student nginx
./operations/restore-postgres.sh backups/postgres/exam-platform-YYYYMMDDTHHMMSSZ.sql.gz
docker compose --env-file .env.production up -d
```

Restaurar archivos persistentes:

```bash
docker compose --env-file .env.production stop api
./operations/restore-files.sh backups/files/app-storage-YYYYMMDDTHHMMSSZ.tgz
docker compose --env-file .env.production up -d api
```

Validar despues del restore:

```bash
./operations/healthcheck.sh
```

## 13. Logs

Los contenedores usan el driver `json-file` con rotacion:

```text
LOG_MAX_SIZE=10m
LOG_MAX_FILE=5
```

Consultar logs:

```bash
docker compose --env-file .env.production logs --tail=200 api
docker compose --env-file .env.production logs --tail=200 nginx
```

Para produccion avanzada, enviar logs a CloudWatch, Azure Monitor, Google Cloud Logging, Datadog, Grafana Loki o servicio equivalente.

## 14. Monitoreo

Levantar monitoreo opcional:

```bash
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

Servicios:

- Prometheus: metricas.
- Grafana: paneles.
- Node Exporter: CPU, RAM, disco y red del servidor.
- cAdvisor: uso de contenedores.
- Blackbox Exporter: chequeos HTTP.

Por seguridad, Prometheus y Grafana escuchan solo en localhost:

```text
PROMETHEUS_BIND=127.0.0.1:9090
GRAFANA_BIND=127.0.0.1:3001
```

Abrir tunel SSH desde tu computadora:

```bash
ssh -L 3001:127.0.0.1:3001 deploy@IP_PUBLICA_DEL_SERVIDOR
```

Luego abrir:

```text
http://127.0.0.1:3001
```

## 15. Checklist antes de publicar

- DNS apunta al servidor.
- Firewall solo permite SSH, HTTP y HTTPS.
- Docker y Compose funcionan.
- `.env.production` tiene secretos reales.
- `SWAGGER_ENABLED=false`.
- `LETSENCRYPT_STAGING=0`.
- HTTPS emite certificado real.
- `healthcheck.sh` finaliza correctamente.
- Login administrador probado.
- Login alumno probado.
- Backup manual probado.
- Restore probado en servidor de prueba.
- Monitoreo levantado o integrado con proveedor cloud.
- Backups copiados fuera del servidor.

## Referencias

- Docker Engine Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose plugin: https://docs.docker.com/compose/install/linux/
- Certbot webroot: https://eff-certbot.readthedocs.io/en/stable/using.html#webroot

