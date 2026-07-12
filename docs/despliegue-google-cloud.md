# Despliegue en Google Cloud Compute Engine

Este manual publica la plataforma como aplicacion web en Google Cloud usando una VM de Compute Engine, Docker Compose, Nginx y HTTPS con Let's Encrypt.

## 1. Decision recomendada

Para la primera publicacion usar:

```text
Google Cloud Compute Engine
Ubuntu 24.04 LTS
Docker Compose
Nginx local
PostgreSQL en Docker con volumen persistente
Backups locales
```

Esta opcion aprovecha la arquitectura que ya existe en el repositorio y evita redisenar el sistema antes de validarlo con usuarios reales.

## 2. Lo que necesito antes del despliegue real

No enviar contrasenas reales por chat. Los secretos deben escribirse directamente en `.env.production` dentro del servidor o guardarse en un gestor seguro.

Necesito que el dueno del sistema confirme:

```text
1. Cuenta de Google Cloud activa.
2. Facturacion habilitada en Google Cloud.
3. Project ID de Google Cloud.
4. Dominio comprado.
5. Lugar donde se administra el DNS del dominio.
6. Correo para Let's Encrypt.
7. Subdominios que se usaran:
   - admin.tu-dominio.com
   - alumno.tu-dominio.com
   - api.tu-dominio.com
8. Region preferida de Google Cloud.
9. Tamano de VM autorizado.
10. Si el repositorio de GitHub sera publico o privado.
```

Para que yo pueda hacerlo directamente, tambien se necesita acceso operativo a Google Cloud con permisos suficientes para Compute Engine, firewall, IP estatica y DNS si se administra en Google Cloud.

## 3. Tamano recomendado de VM

Para demo o pruebas:

```text
Tipo: e2-small
Disco: 30 GB o 50 GB
Uso: validacion inicial
```

Para primera produccion:

```text
Tipo: e2-medium
Disco: 50 GB o 100 GB
Uso: usuarios reales con margen operativo
```

Si habra muchos alumnos conectados al mismo tiempo, usar una VM mayor y planificar Cloud SQL.

## 4. Crear VM en Google Cloud

En Google Cloud Console:

```text
Compute Engine > VM instances > Create instance
```

Configurar:

```text
Name: exam-platform-prod
Machine type: e2-medium
Boot disk: Ubuntu 24.04 LTS
Disk size: 50 GB minimo
Firewall: Allow HTTP traffic
Firewall: Allow HTTPS traffic
```

Crear o reservar una IP externa estatica para la VM. Esa IP sera usada en el DNS del dominio.

## 5. Configurar DNS

En el proveedor del dominio crear registros tipo `A` apuntando a la IP publica de la VM:

```text
admin.tu-dominio.com  -> IP_PUBLICA_VM
alumno.tu-dominio.com -> IP_PUBLICA_VM
api.tu-dominio.com    -> IP_PUBLICA_VM
```

Esperar propagacion DNS antes de pedir certificados reales.

## 6. Entrar por SSH

Desde Google Cloud Console:

```text
Compute Engine > VM instances > SSH
```

Tambien se puede entrar usando Google Cloud CLI u OpenSSH, pero para una primera publicacion el boton SSH del navegador es suficiente.

## 6.1. Despliegue automatico desde Cloud Shell

El repositorio incluye un script para crear la VM, reservar IP, abrir firewall, instalar Docker, clonar el proyecto, generar `.env.production` y levantar Docker Compose:

```text
operations/gcp-deploy-compute-engine.sh
```

Uso recomendado desde Google Cloud Shell:

```bash
git clone https://github.com/G1bby-P/EXAM.git
cd EXAM
chmod +x operations/gcp-deploy-compute-engine.sh

PROJECT_ID="tu-project-id" \
ADMIN_HOST="admin.tu-dominio.com" \
STUDENT_HOST="alumno.tu-dominio.com" \
API_HOST="api.tu-dominio.com" \
LETSENCRYPT_EMAIL="correo@tu-dominio.com" \
ZONE="us-central1-a" \
MACHINE_TYPE="e2-medium" \
BOOT_DISK_SIZE_GB="50" \
./operations/gcp-deploy-compute-engine.sh
```

El script muestra la IP publica asignada. Antes de que HTTPS funcione, los registros DNS `A` de `ADMIN_HOST`, `STUDENT_HOST` y `API_HOST` deben apuntar a esa IP.

Si los DNS todavia no apuntan a la IP, el script se detiene antes de pedir certificados. Actualizar los DNS y volver a ejecutar el mismo comando. La VM y la IP existentes se reutilizan.

Para levantar los contenedores sin pedir certificados todavia:

```bash
RUN_CERTBOT=0 \
PROJECT_ID="tu-project-id" \
ADMIN_HOST="admin.tu-dominio.com" \
STUDENT_HOST="alumno.tu-dominio.com" \
API_HOST="api.tu-dominio.com" \
LETSENCRYPT_EMAIL="correo@tu-dominio.com" \
./operations/gcp-deploy-compute-engine.sh
```

Las credenciales iniciales no se imprimen en GitHub. Quedan en la VM:

```text
/opt/exam-platform/DEPLOYMENT_CREDENTIALS.txt
```

Guardar esos valores en un gestor de contrasenas y borrar el archivo cuando ya no sea necesario.

## 7. Preparar el servidor

Dentro de la VM ejecutar:

```bash
sudo apt update
sudo apt -y upgrade
sudo apt -y install ca-certificates curl gnupg git ufw openssl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker
docker --version
docker compose version
```

Activar firewall del sistema:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

## 8. Descargar el proyecto desde GitHub

Crear carpeta de aplicacion:

```bash
sudo mkdir -p /opt/exam-platform
sudo chown "$USER:$USER" /opt/exam-platform
```

Clonar el repositorio:

```bash
git clone https://github.com/G1bby-P/EXAM.git /opt/exam-platform
cd /opt/exam-platform
```

Si el repositorio es privado, configurar acceso con GitHub antes de ejecutar `git clone`.

## 9. Configurar variables de produccion

Copiar archivo de ejemplo:

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

Ejemplo de dominios:

```text
ADMIN_HOST=admin.tu-dominio.com
STUDENT_HOST=alumno.tu-dominio.com
API_HOST=api.tu-dominio.com
CERT_NAME=admin.tu-dominio.com
CORS_ORIGINS=https://admin.tu-dominio.com,https://alumno.tu-dominio.com,https://api.tu-dominio.com
LETSENCRYPT_EMAIL=correo@tu-dominio.com
```

Generar secretos seguros:

```bash
openssl rand -hex 32
openssl rand -hex 64
openssl rand -hex 64
```

Para primera prueba con certificados de staging:

```text
LETSENCRYPT_STAGING=1
CERTBOT_FORCE_RENEWAL=0
ALLOW_INSECURE_HTTPS=1
SWAGGER_ENABLED=false
```

## 10. Primer despliegue con HTTPS

Dar permisos a scripts:

```bash
chmod +x operations/*.sh
```

Ejecutar despliegue inicial con Let's Encrypt staging:

```bash
./operations/init-letsencrypt.sh
```

Validar:

```bash
./operations/healthcheck.sh
```

Si funciona, editar `.env.production`:

```text
LETSENCRYPT_STAGING=0
CERTBOT_FORCE_RENEWAL=1
ALLOW_INSECURE_HTTPS=0
```

Emitir certificados reales:

```bash
./operations/init-letsencrypt.sh
./operations/healthcheck.sh
```

## 11. Crear usuarios iniciales

Los usuarios se crean con las contrasenas escritas en `.env.production`.

Ejecutar:

```bash
docker compose --env-file .env.production --profile seed up api-seed
```

Usuarios:

```text
admin@exam.local -> SEED_ADMIN_PASSWORD
admin@test.com -> SEED_TEST_ADMIN_PASSWORD
alumno@test.com -> SEED_TEST_STUDENT_PASSWORD
```

Antes de produccion real, eliminar usuarios de prueba o cambiar sus contrasenas.

## 12. Validar URLs

Abrir en navegador:

```text
https://admin.tu-dominio.com
https://alumno.tu-dominio.com
https://api.tu-dominio.com/api/v1/health
```

Probar:

```text
1. Login administrador.
2. Login alumno.
3. Creacion de curso.
4. Creacion de pregunta.
5. Creacion de examen.
6. Asignacion de examen.
7. Finalizacion de examen.
8. Exportacion Excel.
```

## 13. Operacion diaria

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

Actualizar desde GitHub:

```bash
cd /opt/exam-platform
git pull origin main
docker compose --env-file .env.production up -d --build
./operations/healthcheck.sh
```

Reiniciar:

```bash
docker compose --env-file .env.production restart
```

## 14. Backups

El proyecto incluye backup local automatico de PostgreSQL:

```text
backups/postgres
```

Backup manual:

```bash
./operations/backup-postgres.sh
./operations/backup-files.sh
```

Restauracion:

```bash
./operations/restore-postgres.sh backups/postgres/exam-platform-YYYYMMDDTHHMMSSZ.sql.gz
./operations/restore-files.sh backups/files/app-storage-YYYYMMDDTHHMMSSZ.tgz
```

Recomendacion posterior: copiar backups a Cloud Storage para no depender solo del disco de la VM.

## 15. Seguridad minima

Antes de usar con usuarios reales:

```text
1. HTTPS real activo.
2. Firewall Google Cloud con puertos 80 y 443 abiertos.
3. SSH restringido si es posible.
4. UFW activo en la VM.
5. PostgreSQL no expuesto a Internet.
6. SWAGGER_ENABLED=false.
7. Secretos reales, largos y no compartidos.
8. Usuarios de prueba eliminados o cambiados.
9. Backups probados.
10. Restore probado en entorno de prueba.
```

## 16. Evolucion recomendada

Cuando el sistema tenga uso real constante:

```text
1. Mover PostgreSQL a Cloud SQL.
2. Mover backups y archivos a Cloud Storage.
3. Guardar secretos en Secret Manager.
4. Activar Cloud Monitoring y alertas.
5. Evaluar separar servicios en Cloud Run.
```

## 17. Fuentes oficiales

- Compute Engine: https://cloud.google.com/products/compute
- Crear VM Linux: https://docs.cloud.google.com/compute/docs/create-linux-vm-instance
- Conectar por SSH: https://docs.cloud.google.com/compute/docs/connect/standard-ssh
- Reglas de firewall: https://docs.cloud.google.com/compute/docs/samples/compute-firewall-create
- Backups Cloud SQL: https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/backups
