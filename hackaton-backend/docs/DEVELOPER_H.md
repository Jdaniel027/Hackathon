# Developer H — Backend

> Reparto de tareas. Responsable del **cimiento técnico** y de los módulos de lectura del mapa.
> Arquitectura de referencia: `ARCHITECTURE.md`. Contratos: `API_MANUAL.md`. Negocio: `IDEA.md`.

---

## 1. Rol

Cimiento de NestJS + Prisma + PostgreSQL, seguridad sin login (API key admin, rate limiting),
manejo de errores, y los módulos `ubicacion`, `zonas` y `admin`.

Eres el **primer bloque** del equipo: `DEVELOPER_V` depende de tu esquema Prisma y de tu
`AppModule` antes de poder ejecutar crons o reportes.

---

## 2. Archivos que puedes modificar

```
hackaton-backend/
├── package.json · tsconfig*.json · nest-cli.json · eslint.config.mjs · .prettierrc
├── .env.example
├── prisma/schema.prisma · prisma/seed.ts
└── src/
    ├── main.ts · app.module.ts · app.controller.ts · app.service.ts
    ├── bootstrap/configurar-app.ts
    ├── config/env.schema.ts
    ├── prisma/prisma.module.ts · prisma/prisma.service.ts
    ├── common/**            (decorators, guards, middleware, exception, filter, pipes, interceptors)
    └── modules/
        ├── ubicacion/**
        ├── zonas/**
        └── admin/**
```

## 3. Archivos que NO debes modificar

- `modules/reportes/**`, `modules/gemini/**`, `modules/open-meteo/**`,
  `modules/conagua/**`, `modules/crons/**` → son de `DEVELOPER_V`.
- `docs/API_MANUAL.md` → contrato compartido; si cambia un tuyo, avisa y se actualiza.
- Nada fuera de `hackaton-backend/`. Nada en `hackathon-frontend/` ni en `docs/` raíz.

**Si necesitas tocar un archivo de V:** no lo edites. Anota la dependencia en §6 y coordínalo.

---

## 4. Tareas

### Fase 1 — Base
- [ ] Proyecto NestJS + pnpm + TypeScript estricto.
- [ ] `.env.example` con las variables de `ARCHITECTURE.md` §9 (sin valores reales).
- [ ] `env.schema.ts` con zod; no arranca sin `DATABASE_URL`, `GEMINI_API_KEY`, `ADMIN_API_KEY`.
- [ ] `PrismaModule` global + `PrismaService`.
- [ ] `prisma/schema.prisma` con los modelos de `IDEA.md` §2.
- [ ] `seed.ts`: México → Sinaloa → **Mazatlán** (con `idEstadoSmn` / `idMunSmn`). *(ver §5)*

### Fase 2 — Cimiento común
- [ ] `configurar-app.ts`: prefijo `/api/v1`, CORS con orígenes de env, `helmet`, pipe, filtro, Swagger en `/api/v1/docs`.
- [ ] `AppValidationPipe` + message factory.
- [ ] `AppGlobalExceptionFilter` (Prisma + HTTP + unknown) con envelope y `requestId`.
- [ ] `RequestIdMiddleware`.
- [ ] `appException()` + catálogo `APP_ERRORS` (incluye `ADMIN_KEY_INVALIDA`, `MUNICIPIO_NO_ENCONTRADO`, `ZONA_NO_ENCONTRADA`, `RATE_LIMIT_EXCEEDED`).

### Fase 3 — Seguridad y rate limiting
- [ ] `ThrottlerModule` global desde ConfigService.
- [ ] `@RateLimitEspecifico(limit, ttl)`.
- [ ] Límites: global 100/min; **reportes 2/15min** (aplica V en su endpoint, tú dejas el decorator);
      admin 40/15min (configurable por env).
- [ ] `ApiKeyGuard` global para rutas `@Admin()`; comparación constante-tiempo; sin log de la clave.
- [ ] `trust proxy` correcto detrás de reverse proxy.
- [ ] `429` con `Retry-After` y `retryAfterSeg` en `details`.

### Fase 4 — Lectura del mapa
- [ ] `ubicacion`: modelos País/Estado/Municipio y query por slug.
- [ ] `zonas`: utilidades `mitadesEnGrados`, `contiene`, `limites` (`IDEA.md` §3).
- [ ] `GET /mapa/:municipioSlug` (solo lectura de BD) → `MapaResponse`.
- [ ] `GET /zonas/:id` con últimas lecturas.
- [ ] `GET /health`.

### Fase 5 — Admin
- [ ] `POST /admin/simular-lluvia`
- [ ] `POST /admin/cron/:nombre` (whitelist de nombres; ejecuta la tarea de V)
- [ ] `POST /admin/zonas/generar` `{ municipioSlug, sw, ne }`
- [ ] `POST /admin/riesgo-altura/:zonaId`
- [ ] `POST /admin/ciclon` (la lógica de ciclones es de V; tú expones la ruta)

---

## 5. Notas y decisiones abiertas

- **Alcance geográfico:** la demo es **Mazatlán**. `IDEA.md` menciona Ahome/Los Mochis; el
  alcance acordado es multi-municipio. El seed usa Mazatlán.
- **Umbrales de lluvia:** parámetro por municipio, no constante hardcodeada.
- **Capa de caché:** no implementes Redis. Deja el acceso a BD detrás de un servicio
  (`ZonasService.getMapa(slug)`) para poder insertar caché-aside después sin tocar el controller.

---

## 6. Dependencias

| De quién | Qué necesitas | Cuándo |
|---|---|---|
| — | Eres el bloque inicial | — |
| `DEVELOPER_V` | — | V espera: schema Prisma migrado, `PrismaModule` global, decorator `@RateLimitEspecifico`, y un servicio de zonas expuesto para que el cron escriba `LecturaClima`/`Zona`. |

Para `/admin/cron/:nombre` y `/admin/ciclon`: define la firma del servicio que V implementará
(p. ej. `CronRunner.ejecutar(nombre)` y `CiclonesService.crearDesdeAdmin(dto)`) y publícala en §6
para que V la cumpla. No implementes la lógica de V.

---

## 7. Definición de terminado

- [ ] `pnpm lint` sin errores.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `pnpm prisma validate` y migración aplicable.
- [ ] `pnpm build` correcto.
- [ ] Swagger refleja los endpoints reales.
- [ ] Sin `any` sin justificación, sin secretos en el repo.
- [ ] Contracts en `API_MANUAL.md` coinciden con lo implementado.

---

## 8. Reglas no negociables

1. **Nunca hagas commit sin permiso explícito del usuario.**
2. No agregues dependencias sin justificar y pedir aprobación.
3. No inventes endpoints ni campos fuera de `API_MANUAL.md` / `IDEA.md`.
4. No modifiques archivos de `DEVELOPER_V` ni nada fuera de `hackaton-backend/`.
5. Mantén la app compilable en cada cambio.
6. Sin credenciales ni claves reales en código o documentación.
