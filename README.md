# NuVet API

Backend multi-tenant para la plataforma NuVet, construido con NestJS, Prisma y PostgreSQL. Expone APIs versionadas bajo `/api/v1`, documentadas con Swagger y aseguradas con JWT.

## Stack principal
- NestJS 11
- Prisma + PostgreSQL
- Redis + Bull (colas de trabajos)
- MinIO/S3 para almacenamiento de archivos
- JWT (access/refresh) y Passport
- Swagger (solo en entornos no productivos)

## Requisitos previos
- Node.js 20+
- pnpm
- Docker y Docker Compose (para levantar dependencias locales: PostgreSQL, Redis, MinIO)

## Configuracion rapida (local)
1) Instalar dependencias:
   ```bash
   pnpm install
   ```
2) Crear el archivo `.env` en la raiz de `nuvet-api` con tus valores. Variables principales:
   ```bash
   NODE_ENV=development
   PORT=3000
   CORS_ORIGINS=http://localhost:4200,http://localhost:3001,http://localhost:8081

   DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>

   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=<redis_password>

   JWT_ACCESS_SECRET=<jwt_access_secret>
   JWT_REFRESH_SECRET=<jwt_refresh_secret>
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d

   S3_ENDPOINT=http://localhost:9000
   S3_REGION=us-east-1
   S3_ACCESS_KEY=<s3_key>
   S3_SECRET_KEY=<s3_secret>
   S3_BUCKET=nuvet-files

   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=<smtp_user>
   SMTP_PASS=<smtp_pass>
   SMTP_FROM="NuVet <noreply@nuvet.app>"

   EXPO_ACCESS_TOKEN=<expo_token>
   ```
3) Generar cliente Prisma y aplicar migraciones:
   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate
   ```
   (Opcional) sembrar datos base:
   ```bash
   pnpm prisma:seed        # datos minimos
   pnpm prisma:seed:full   # dataset completo
   ```
4) Ejecutar en desarrollo (watch):
   ```bash
   pnpm dev
   ```
   La API quedara en `http://localhost:3000/api/v1` y la documentacion Swagger en `http://localhost:3000/api/v1/docs`.

## Docker Compose (infra local)
- Levantar Postgres, Redis y MinIO:
  ```bash
  docker compose up -d postgres redis minio
  ```
- Si quieres levantar todo con contenedor del backend (revisa variables en `docker-compose.yml`):
  ```bash
  docker compose up -d
  ```

## Scripts utiles
- `pnpm dev` – arranque en modo watch.
- `pnpm build` – compila a `dist`.
- `pnpm start` – ejecuta la build compilada.
- `pnpm lint` – lint con ESLint.
- `pnpm test` – tests con Jest.
- `pnpm prisma:generate` – generar cliente Prisma.
- `pnpm prisma:migrate` – aplicar migraciones en desarrollo.
- `pnpm prisma:push` – sincronizar schema sin migracion.
- `pnpm prisma:studio` – UI para la base.
- `pnpm prisma:seed` / `pnpm prisma:seed:full` – sembrado de datos.

## Notas de API
- Prefijo global: `/api`
- Versionado: URI, version por defecto `v1` (ejemplo: `/api/v1/health`).
- CORS: origenes configurables via `CORS_ORIGINS`.
- Seguridad: Helmet, compresion, pipes de validacion, filtros de excepcion e interceptor de transformacion global.
- Autenticacion: JWT (bearer), usa `Authorization: Bearer <token>`.

## Comprobacion de salud
Endpoint rapido para monitoreo: `GET /api/v1/health`.

## Estructura de modulos (resumen)
Autenticacion, tenants, usuarios, clientes, mascotas, citas, historiales medicos, vacunaciones, estetica/grooming, cirugias, inventario, tienda, adopciones, notificaciones, reportes y archivos (S3/MinIO).
