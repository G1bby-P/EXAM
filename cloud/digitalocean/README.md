# DigitalOcean

## Opcion simple

Usar un Droplet Ubuntu 24.04 LTS y desplegar con Docker Compose.

Recomendado para primera publicacion:

- 2 vCPU minimo.
- 4 GB RAM minimo.
- 50 GB SSD minimo.
- Backups del Droplet activados.

## Pasos

1. Crear Droplet Ubuntu.
2. Configurar DNS:
   - `admin.example.com`
   - `alumno.example.com`
   - `api.example.com`
3. Abrir puertos 80 y 443 en el firewall.
4. Seguir:

```text
docs/despliegue-vps.md
```

## Produccion con mayor criticidad

Para datos sensibles o alta disponibilidad:

- Usar Managed PostgreSQL.
- Usar Spaces o almacenamiento externo para archivos si se decide no depender del disco local.
- Usar snapshots y backups automaticos.
- Enviar logs a un servicio externo.

