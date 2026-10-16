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
├── package.json · tsconfig*.json · nest-cli.json · .oxlintrc.json · .prettierrc
├── prisma.config.ts · .env.example · pnpm-workspace.yaml
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
- [x] Proyecto NestJS + pnpm + TypeScript estricto.
- [x] `.env.example` con las variables de `ARCHITECTURE.md` §9 (sin valores reales).
- [x] `env.schema.ts` con zod; no arranca sin `DATABASE_URL`, `GEMINI_API_KEY`, `ADMIN_API_KEY`.
- [x] `PrismaModule` global + `PrismaService`.
- [x] `prisma/schema.prisma` con los modelos de `IDEA.md` §2.
- [ ] `seed.ts`: México → Sinaloa → **Mazatlán** (con `idEstadoSmn` / `idMunSmn`). El archivo existe; los IDs son provisionales y en Supabase siguen `null`. Validarlos con Conagua antes de ejecutar de nuevo el seed (ver §5).

### Fase 2 — Cimiento común
- [x] `configurar-app.ts`: prefijo `/api/v1`, CORS con orígenes de env, `helmet`, pipe, filtro, Swagger en `/api/v1/docs`.
- [x] `AppValidationPipe` + message factory.
- [x] `AppGlobalExceptionFilter` (Prisma + HTTP + unknown) con envelope y `requestId`.
- [x] `RequestIdMiddleware`.
- [x] `appException()` + catálogo `APP_ERRORS` (incluye `ADMIN_KEY_INVALIDA`, `MUNICIPIO_NO_ENCONTRADO`, `ZONA_NO_ENCONTRADA`, `RATE_LIMIT_EXCEEDED`).

### Fase 3 — Seguridad y rate limiting
- [x] `ThrottlerModule` global desde ConfigService.
- [x] `@RateLimitEspecifico(limit, ttl)`.
- [x] Límites: global 100/min; **reportes 2/15min** (aplica V en su endpoint, tú dejas el decorator);
      admin 40/15min (configurable por env).
- [x] `ApiKeyGuard` global para rutas `@Admin()`; comparación constante-tiempo; sin log de la clave.
- [x] `trust proxy` desactivado por defecto y configurable con `TRUST_PROXY_HOPS` según despliegue.
- [x] `429` con `Retry-After` y `retryAfterSeg` en `details`.

### Fase 4 — Lectura del mapa
- [x] `ubicacion`: modelos País/Estado/Municipio y query por slug.
- [x] `zonas`: utilidades `mitadesEnGrados`, `contiene`, `limites` (`IDEA.md` §3).
- [x] `GET /mapa/:municipioSlug` (solo lectura de BD) → `MapaResponse`.
- [x] `GET /zonas/:id` con las últimas **25** lecturas.
- [x] `GET /health`.

### Fase 5 — Admin
- [x] `POST /admin/simular-lluvia` (validación y escritura transaccional; pruebas con mocks).
- [x] `POST /admin/cron/:nombre` (API key y whitelist; la ejecución real es pendiente de V).
- [x] `POST /admin/zonas/generar` `{ municipioSlug, sw, ne }` (límites ordenados, máximo 500 celdas).
- [x] `POST /admin/riesgo-altura/:zonaId` (comprueba elevaciones y evita duplicados secuenciales).
- [x] `POST /admin/ciclon` (expone la ruta; responde 501 sin escribir hasta integración con V).

**Pendientes de integración y pruebas reales:** ver [`PENDIENTES.md`](PENDIENTES.md).

---

## 5. Notas y decisiones abiertas

- **Alcance geográfico:** la demo es **Mazatlán**. `IDEA.md` menciona Ahome/Los Mochis; el
  alcance acordado es multi-municipio. El seed usa Mazatlán.
- **Umbrales de lluvia:** parámetro por municipio, no constante hardcodeada.
- **IDs SMN de Mazatlán:** `idEstadoSmn=25` / `idMunSmn=12` son provisionales en el seed;
  no ejecutarlo de nuevo sobre Supabase hasta validarlos con una respuesta real de Conagua.
- **Historial de zona:** `GET /zonas/:id` solicita las últimas 25 lecturas, ordenadas
  por `creadoEn` descendente. Proponer este detalle en `API_MANUAL.md` al equipo.
- **Capa de caché:** no implementes Redis. Deja el acceso a BD detrás de un servicio
  (`ZonasService.getMapa(slug)`) para poder insertar caché-aside después sin tocar el controller.

---

## 6. Dependencias

| De quién | Qué necesitas | Cuándo |
|---|---|---|
| — | Eres el bloque inicial | — |
| `DEVELOPER_V` | — | V espera: schema Prisma migrado, `PrismaModule` global, decorator `@RateLimitEspecifico`, y un servicio de zonas expuesto para que el cron escriba `LecturaClima`/`Zona`. |

`/admin/cron/:nombre` delega a `CronsService.ejecutar(nombre)`; V debe completar los trabajos.
`/admin/ciclon` permanece en 501 hasta acordar con V la firma del servicio que recibirá
`RegistrarCiclonDto` y devolverá `RegistrarCiclonResultado`. No implementar la lógica de V en H.
Seguimiento de ambas dependencias en [`PENDIENTES.md`](PENDIENTES.md).

---

## 7. Definición de terminado

- [x] `pnpm lint` sin errores (queda advertencia por `ReporteApi` sin usar en módulo de V).
- [x] `pnpm typecheck` (`tsc --noEmit`) sin errores.
- [x] `pnpm prisma:validate` y `prisma migrate status`: esquema válido, migración al día.
- [x] `pnpm build` correcto.
- [x] Swagger disponible en `/api/v1/docs`; rutas registradas verificadas en la prueba HTTP.
- [ ] Sin `any` sin justificación, sin secretos en el repo (sin `any` de tipo en `src/`; `.env` no versionado; falta auditoría completa de secretos).
- [ ] Contracts en `API_MANUAL.md` coinciden con lo implementado.

Verificado el 16/10/2026: `pnpm test` (47/47); la prueba HTTP cubrió rutas públicas y admin. Los límites reales de rate limiting no se probaron: la corrida HTTP anterior los desactivó temporalmente. El contrato compartido aún requiere actualizar las 25 lecturas y el 501 de ciclón.

---

## 8. Reglas no negociables

1. **Nunca hagas commit sin permiso explícito del usuario.**
2. No agregues dependencias sin justificar y pedir aprobación.
3. No inventes endpoints ni campos fuera de `API_MANUAL.md` / `IDEA.md`.
4. No modifiques archivos de `DEVELOPER_V` ni nada fuera de `hackaton-backend/`.
5. Mantén la app compilable en cada cambio.
6. Sin credenciales ni claves reales en código o documentación.
