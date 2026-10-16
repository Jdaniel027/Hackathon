# AquaReport — Backend

API de alertas de inundación (NestJS + Prisma + PostgreSQL). Sin login: la API
pública es anónima y las rutas `/admin/*` se protegen con el header `x-api-key`.

## Requisitos

- Node.js 24+
- pnpm 11+
- PostgreSQL

## Puesta en marcha

```bash
pnpm install
cp .env.example .env        # completa DATABASE_URL, GEMINI_API_KEY, ADMIN_API_KEY...
pnpm prisma:generate        # genera el cliente Prisma en src/generated/prisma
pnpm prisma:migrate         # crea/actualiza el esquema en la base de datos
pnpm prisma:seed            # datos demo: México → Sinaloa → Guasave
pnpm start:dev
```

- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/v1/docs
- Health: http://localhost:3000/api/v1/health

## Scripts útiles

| Script | Descripción |
| --- | --- |
| `pnpm start:dev` | Servidor con recarga en caliente |
| `pnpm build` | Compila a `dist/` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | oxlint (type-aware) |
| `pnpm prisma:generate` | Genera el cliente Prisma |
| `pnpm prisma:migrate` | Migraciones de desarrollo |
| `pnpm prisma:seed` | Carga datos demo |

## Estructura

```
src/
  bootstrap/        Configuración global (CORS, validación, Swagger)
  common/           Errores, filtros, pipes, guards, middleware, decoradores
  config/           Carga y validación de variables de entorno (zod)
  prisma/           PrismaService (driver adapter @prisma/adapter-pg)
  modules/
    ubicacion/      Países, estados y municipios
    zonas/          Zonas, utilidades geográficas y endpoint /mapa
    reportes/       Reportes ciudadanos (POST/GET /reportes)
    open-meteo/     Cliente Open-Meteo (crons/admin)
    conagua/        Cliente Conagua/SMN (crons/admin)
    gemini/         Clasificación de fotos con Gemini
    crons/          Tareas programadas
    admin/          Rutas /admin/* (x-api-key)
```

## Notas de arquitectura

- **Prisma 7** usa driver adapter: la URL vive en `prisma.config.ts` (CLI) y en
  `@prisma/adapter-pg` (aplicación). El cliente se genera con el generator
  `prisma-client` en `src/generated/prisma` (ignorado por git).
- Los datos externos (Open-Meteo, Conagua, Gemini) **solo** se consultan desde
  crons y reportes; los endpoints de lectura sirven desde PostgreSQL.
- **Redis** es futuro (cache-aside), no forma parte del MVP.

## Demo local con build

Con `.env` configurado y PostgreSQL disponible:

```bash
pnpm prisma:generate
pnpm prisma:deploy
pnpm prisma:seed
pnpm build
pnpm start:prod
```

`prisma:seed` inserta o actualiza Guasave (25/11), una zona demo y un riesgo
manual; no borra datos de otros municipios. Ejecutarlo solo en una base donde
esté autorizada la escritura. Verifica `GET /api/v1/health` y
`GET /api/v1/mapa/guasave`. La zona inicia en `SIN_DATOS`: al arrancar el backend
se dispara la actualización climática sin bloquear HTTP, se expiran riesgos y,
al terminar el clima, se reevaluan reportes. Mientras corre esa primera carga,
el mapa puede mostrar todavía `SIN_DATOS`. Los crons periódicos continúan en
los minutos 00, 15, 30 y 45 (clima), y cada 10 minutos (reportes).

`POST /reportes` clasifica y guarda un reporte `PENDIENTE`; cada 10 minutos
`reevaluarReportes` compara con lluvia reciente y, si lo corrobora, calcula
una **estimación potencial de área** mediante celdas de elevación y la publica
como círculos `INUNDACION/CLIMA` en `GET /mapa/guasave`. No son un polígono
medido ni una certificación de inundación.

La documentación detallada está en `docs/` (ARCHITECTURE, API_MANUAL,
DEVELOPER_H, DEVELOPER_V, IDEA).
