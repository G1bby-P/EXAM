# Credenciales de prueba

El proyecto no incluye contrasenas reales en el repositorio. Por seguridad, los usuarios de prueba se crean con los valores que se definan en el archivo privado `.env.production`.

## 1. Definir contrasenas

Abrir `.env.production` y reemplazar estos valores:

```text
SEED_ADMIN_PASSWORD=escribir-una-contrasena-segura
SEED_TEST_ADMIN_PASSWORD=escribir-una-contrasena-para-admin-test
SEED_TEST_STUDENT_PASSWORD=escribir-una-contrasena-para-alumno-test
```

No usar los textos `replace-with-*` como contrasena. Son marcadores de posicion.

## 2. Crear o actualizar usuarios

Ejecutar el seed:

```bash
docker compose --env-file .env.production --profile seed up api-seed
```

El seed crea o actualiza estos usuarios:

```text
admin@exam.local -> usa SEED_ADMIN_PASSWORD
admin@test.com -> usa SEED_TEST_ADMIN_PASSWORD
alumno@test.com -> usa SEED_TEST_STUDENT_PASSWORD
```

Si se cambia una contrasena en `.env.production`, ejecutar nuevamente el mismo comando para actualizarla en PostgreSQL.

## 3. Donde iniciar sesion

```text
https://admin.tu-dominio.com
admin@exam.local
admin@test.com

https://alumno.tu-dominio.com
alumno@test.com
```

El usuario `alumno@test.com` no debe entrar al panel administrador. Debe entrar al modulo del alumno.

## 4. Si el login falla

Revisar que el seed haya terminado correctamente:

```bash
docker compose --env-file .env.production logs api-seed
```

Revisar errores de autenticacion en la API:

```bash
docker compose --env-file .env.production logs api
```

Si el seed no se ejecuto, los usuarios no existen. Si se cambio `.env.production` despues del seed, ejecutar el seed otra vez.
