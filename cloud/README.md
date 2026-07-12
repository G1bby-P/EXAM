# Despliegue cloud

La plataforma es una aplicacion web y se publica con URLs HTTPS. No requiere instalar software en las computadoras de los usuarios.

## Opciones soportadas

- VPS con Docker Compose: AWS EC2, Azure VM, Google Compute Engine o DigitalOcean Droplet.
- Contenedores administrados: ECS, Azure Container Apps, Cloud Run o servicios equivalentes.
- Base de datos administrada: recomendada para produccion con mayor criticidad.

## Opcion recomendada para primera publicacion

Usar un VPS Ubuntu con:

- Docker Compose.
- Nginx local como reverse proxy.
- Certbot con Let's Encrypt.
- PostgreSQL en volumen persistente.
- Backups locales y copia externa.
- Monitoreo opcional con Prometheus/Grafana.

Manual:

```text
docs/despliegue-vps.md
```

## Arquitectura cloud administrada

Para produccion de mayor escala se recomienda separar responsabilidades:

- API NestJS como servicio de contenedor.
- Admin Next.js como servicio de contenedor.
- Alumno Next.js como servicio de contenedor.
- PostgreSQL administrado.
- Secret manager del proveedor.
- Balanceador HTTPS administrado.
- Logs centralizados.
- Backups administrados y restore probado.

## Hosts recomendados

- `admin.example.com`: panel administrador.
- `alumno.example.com`: modulo del alumno.
- `api.example.com`: API publica.

Si admin y alumno consumen `/api/v1` bajo su mismo host, el reverse proxy debe enrutar `/api/*` hacia la API. Esto reduce problemas CORS.

## Variables minimas

- `DATABASE_URL` o variables `POSTGRES_*` si se usa Compose.
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN_DAYS`
- `CORS_ORIGINS`
- `TRUST_PROXY=true`
- `SWAGGER_ENABLED=false`
- `BCRYPT_ROUNDS=12`
- `ADMIN_HOST`
- `STUDENT_HOST`
- `API_HOST`

## Orden de despliegue

1. Provisionar red, servidor y DNS.
2. Configurar firewall.
3. Instalar Docker y Docker Compose.
4. Configurar `.env.production`.
5. Levantar servicios.
6. Emitir HTTPS con Let's Encrypt.
7. Ejecutar migraciones.
8. Validar `/api/v1/health`.
9. Probar login admin y alumno.
10. Activar backups, renovacion de certificados y monitoreo.
