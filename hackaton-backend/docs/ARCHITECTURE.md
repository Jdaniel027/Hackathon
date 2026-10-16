# Arquitectura — AquaReport Backend

> Documento de arquitectura del backend. Derivado del molde base `ARQUITECTURA_BASE.md`
> (NestJS + Prisma), **adaptado a un sistema sin usuarios ni login**.
> La especificación funcional y de negocio vive en `IDEA.md`; este documento define el cimiento técnico.

---

## 1. Propósito

Backend para **AquaReport**: alertas de inundación por precipitación, elevación y reportes
ciudadanos anónimos.

Características del cimiento:

- API **pública sin autenticación** (no hay usuarios, no hay login, **no hay JWT**).
- Endpoints de administración protegidos con **`x-api-key`**.
- **Rate limiting** global y agresivo en los endpoints que consumen Gemini.
- Envelope de error consistente, message factory, filtro global de Prisma, Swagger.
- Diseño **multi-municipio**; la demo actual es **Guasave** (D-007).
- **Redis NO es dependencia del MVP**: se documenta como evolución futura (caché y rate limiting distribuido).

---

## 2. Stack

| Capa | Tecnología |
|------|------------|
| Framework | NestJS 12 (Node.js + TypeScript) |
| ORM | Prisma 7 (PostgreSQL) |
| Base de datos | PostgreSQL 15+ |
| Autenticación usuarios | **Ninguna. La API es anónima.** |
| Autenticación admin | Header `x-api-key` comparado contra `ADMIN_API_KEY` |
| Rate limiting | `@nestjs/throttler` (en memoria en el MVP) |
| Validación | `class-validator` + `class-transformer` |
| Env | `zod` (`validateEnv`) |
| Documentación | `@nestjs/swagger` |
| Clima | Open-Meteo (Forecast + Elevation) |
| Pronóstico oficial | Conagua / SMN |
| IA | `@google/genai` (clasificación de fotos) |
| EXIF | `exifr` |
| Crons | `@nestjs/schedule` |
| Caché futuro | Redis (fuera del MVP) |

Gestor de paquetes: **pnpm**.

---

## 3. Decisiones de diseño

| Tema | Decisión |
|------|----------|
| Usuarios / login | **No existen.** Sin `Usuario`, sin sesiones, sin roles. |
| JWT / cookies / bcrypt | **Eliminados del molde base.** No se copian. |
| API pública | Anónima. Lectura libre con rate limit. |
| Escritura anónima | `POST /reportes` con rate limit estricto, validación de imagen y CAPTCHA (pendiente de decisión). |
| Admin | `x-api-key` desde variable de entorno. Nunca en el frontend ni en Git. |
| Crons | Internos, no expuestos como rutas públicas. Ejecución manual vía admin sólo para demo. |
| Alcance geográfico | Multi-municipio. Demo: **Guasave** (ver §11). |
| Datos externos | Los clientes externos **no** se llaman desde endpoints de lectura. Se persisten por cron y se leen de PostgreSQL. |
| Redis | Futuro. Cache-aside por municipio + contadores compartidos. Ver §10. |
| Foto de reporte | Se procesa en memoria y **no se almacena**. |
| Prisma | Schema único en `public` (sin multi-schema, no hay esquema `usuario`). |
| Swagger | Sí, en `/api/v1/docs`. |

---

## 4. Estructura de carpetas

```
hackaton-backend/
├── package.json · tsconfig.json · tsconfig.build.json · nest-cli.json
├── .oxlintrc.json · .prettierrc · .prettierignore · .gitignore · pnpm-workspace.yaml
├── prisma.config.ts           # Prisma 7: URL de conexión para el CLI (generate/migrate)
├── .env · .env.example
├── prisma/
│   ├── schema.prisma          # modelos de IDEA.md §2
│   └── seed.ts                # Pais → Estado → Municipio (Guasave) + ids SMN
└── src/
    ├── generated/prisma/      # cliente Prisma 7 (generado, git-ignored)
    ├── main.ts                # bootstrap + rawBody
    ├── app.module.ts          # Config, Throttler, Schedule, guard admin global
    ├── app.controller.ts      # GET /health
    ├── app.service.ts
    ├── bootstrap/
    │   └── configurar-app.ts  # prefijo /api/v1, CORS, pipe, filtro, Swagger
    ├── config/
    │   ├── load-env.ts        # carga .env antes de evaluar decoradores
    │   └── env.schema.ts      # zod: DATABASE_URL, GEMINI_API_KEY, ADMIN_API_KEY, límites
    ├── prisma/
    │   ├── prisma.module.ts   # @Global
    │   └── prisma.service.ts
    ├── common/
    │   ├── decorators/
    │   │   ├── admin.decorator.ts         # @Admin() → aplica el guard
    │   │   └── rate-limit.decorator.ts    # @RateLimitEspecifico(limit, ttl)
    │   ├── guards/
    │   │   └── api-key.guard.ts           # global para rutas @Admin
    │   ├── middleware/
    │   │   └── request-id.middleware.ts
    │   ├── exception/
    │   │   ├── app-exception.ts           # appException() + APP_ERRORS
    │   │   ├── app-bad-request.exception.ts
    │   │   └── validation-message.ts
    │   ├── filter/
    │   │   └── app-global.filter.ts       # Prisma + HTTP + unknown → envelope
    │   ├── pipes/
    │   │   └── app-validation.pipe.ts
    │   └── interceptors/
    │       └── big-int-serialize.interceptor.ts
    └── modules/
        ├── ubicacion/        # Pais, Estado, Municipio (lectura)
        ├── zonas/             # Zona, ZonaRiesgo, utilidades de límites, GET /mapa
        ├── reportes/          # POST/GET /reportes, EXIF, validaciones
        ├── open-meteo/        # cliente HTTP (sin DB)
        ├── conagua/           # cliente HTTP (sin DB)
        ├── gemini/            # cliente Gemini (sin DB)
        ├── crons/             # actualizarClima, reevaluarReportes, expirarRiesgos, revisarCiclones
        └── admin/             # rutas /admin/* con @Admin()
```

Regla: los módulos cliente (`open-meteo`, `conagua`, `gemini`) solo traen y normalizan datos.
`crons`, `reportes` y `admin` deciden y guardan.

---

## 5. Flujo de datos

```
Open-Meteo / Conagua ──► modules/* (clientes, sin DB) ──► crons ──► PostgreSQL
Gemini ──► gemini ──► reportes ──► PostgreSQL                    │
                                                                  ▼
Frontend ──► API pública (/mapa, /reportes, /zonas) ◄── lee PostgreSQL (siempre)
```

**Regla clave:** `GET /mapa/:slug` y `GET /zonas/:id` leen **solo PostgreSQL**.
Ningún endpoint de lectura invoca Open-Meteo, Conagua o Gemini en la petición.
La única excepción es `POST /reportes`, que sí llama a Gemini de forma síncrona tras pasar el rate limit.

Al iniciar la aplicación, `CronsService` dispara en segundo plano `actualizarClima`
y `expirarRiesgos`; cuando termina la actualización climática, ejecuta
`reevaluarReportes`. La programación periódica sigue activa. Las invocaciones
simultáneas del mismo trabajo en una instancia comparten su ejecución; ninguna
lectura HTTP consulta directamente a proveedores.

Esto garantiza que una búsqueda repetida (ej. Guasave en la demo) sea barata:
1 consulta a la base, sin llamadas externas.

---

## 6. Seguridad sin login

1. **API pública anónima:** lectura libre, rate limit global, validación estricta.
2. **`POST /reportes`:** el único endpoint anónimo que escribe y consume IA. Protegido por:
   rate limit estricto (§7), validación de tamaño/MIME/contenido, validación de coordenadas
   contra zonas existentes, validación de fecha EXIF. CAPTCHA (Turnstile) pendiente de decisión.
3. **`/admin/*`:** guard global `ApiKeyGuard` sobre rutas decoradas con `@Admin()`.
   Compara el header `x-api-key` con `ADMIN_API_KEY` usando comparación constante-tiempo.
   La clave vive solo en el entorno; nunca se registra en logs ni se expone en Swagger como valor.
4. **HTTP:** HTTPS obligatorio en producción, `helmet`, CORS con orígenes explícitos del
   frontend (nunca `origin: '*'` combinado con admin), límite de tamaño de body.
5. **Prisma:** sin SQL manual con entradas del usuario.
6. **Logs:** sin fotos, sin API keys, sin stacks al cliente.

CORS y throttling **no** son autenticación; por eso admin lleva API key aparte.

---

## 7. Rate limiting

| Alcance | Límite | TTL |
|---|---:|---:|
| `POST /reportes` (usa Gemini) | **2** | 15 min |
| `/admin/*` (configurable) | 40 | 15 min |
| Resto de la API pública | 100 | 1 min |

- Implementación: `ThrottlerModule` global + `@RateLimitEspecifico(limit, ttl)` por endpoint.
- Contadores **en memoria** (MVP, una instancia). Redis los hará compartidos en el futuro (§10).
- Respuesta `429` traducida por el filtro global, exponiendo `retryAfterSeg` desde `Retry-After`.
- **Desactivar un límite:** `RATE_LIMIT_ADMIN_LIMIT=0` (o `RATE_LIMIT_REPORTES_LIMIT=0`) se
  interpreta como *sin límite*. Útil en pruebas locales de admin; **no** recomendado en producción.
- `trust proxy` debe estar configurado detrás de un reverse proxy; si no, se limita la IP del proxy.

**Limitación conocida (aceptada en el MVP):** usuarios detrás de la misma IP (misma red/CGNAT)
comparten el cupo.

---

## 8. Manejo de errores

Heredado del molde. Todos los errores salen con el mismo envelope:

```json
{
  "requestId": "uuid",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Demasiadas solicitudes. Intenta más tarde.",
  "statusCode": 429,
  "timestamp": "2026-10-15T19:45:00.000Z",
  "path": "/api/v1/reportes",
  "details": { "retryAfterSeg": 300 }
}
```

- `AppValidationPipe`: `transform`, `whitelist`, `forbidNonWhitelisted`, `stopAtFirstError`,
  con message factory (`validationMessage(code, message)`).
- `AppGlobalExceptionFilter`: traduce códigos Prisma (`P2002`, `P2003`, `P1001`, …), respeta
  `HttpException` y convierte errores desconocidos en `500 INTERNAL_SERVER_ERROR` (log con stack).
- Errores 4xx sin log de stack; 5xx con log.

Códigos del dominio (ejemplos): `REPORT_FORA_DE_ZONA`, `REPORT_FECHA_INVALIDA`,
`REPORT_ARCHIVO_INVALIDO`, `ADMIN_KEY_INVALIDA`, `MUNICIPIO_NO_ENCONTRADO`.

---

## 9. Variables de entorno

```env
# App
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:5173

# Base de datos
DATABASE_URL=postgresql://usuario:password@localhost:5432/aquareport?schema=public

# Externas
GEMINI_API_KEY=              # solo backend, nunca en git ni en el front

# Admin
ADMIN_API_KEY=               # >= 32 caracteres

# Rate limiting
RATE_LIMIT_GLOBAL_LIMIT=100
RATE_LIMIT_GLOBAL_TTL_MS=60000
RATE_LIMIT_REPORTES_LIMIT=2
RATE_LIMIT_REPORTES_TTL_MS=900000
RATE_LIMIT_ADMIN_LIMIT=40
RATE_LIMIT_ADMIN_TTL_MS=900000

# Redis (futuro — ignoradas en el MVP)
# REDIS_URL=
# MAPA_CACHE_TTL_SECONDS=
```

`env.schema.ts` valida todo con `zod`; la app no arranca si faltan `DATABASE_URL`,
`GEMINI_API_KEY` o `ADMIN_API_KEY`.

---

## 10. Redis — evolución futura (no en el MVP)

Objetivo: que una búsqueda repetida (Guasave, Mazatlán, lo que sea) no recomponga la respuesta
ni reconsulte todo. Patrón **cache-aside**:

1. `GET /mapa/:slug` intenta leer `mapa:{slug}:v1` en Redis.
2. Si es un miss, compone desde PostgreSQL y escribe la clave.
3. TTL corto, alineado a la frecuencia del cron `actualizarClima` (15 min). Ej. `TTL = 900s`.
4. Invalidación tras: `actualizarClima`, `reevaluarReportes`, `expirarRiesgos`,
   `revisarCiclones`, y toda escritura de `/admin/*`.

Reglas:

- **PostgreSQL es la fuente de verdad.** Redis es solo aceleración.
- Si Redis cae o no está configurado, el backend responde directo desde PostgreSQL (fail-open).
- Claves versionadas (`:v1`) para poder migrar el formato sin dual-write.
- TTL con jitter para evitar que muchas claves expiren en el mismo instante.
- Opcional: bloqueo corto por clave para evitar que N peticiones simultáneas reconstruyan a la vez.
- Redis también servirá para **rate limiting compartido** cuando haya más de una instancia.

---

## 11. Alcance geográfico

- Arquitectura **multi-municipio**: nada está codificado a un municipio fijo.
- `Municipio` soporta `idEstadoSmn` / `idMunSmn` para filtrar la respuesta nacional de Conagua.
- **Demo actual: Guasave** (seed para nuevas demos). Mazatlán fue la demo anterior;
  si ya existe en una base no se borra automáticamente.
- Guasave también sirve como ejemplo de búsqueda repetida que debe ser barata (caché futura).
- Los umbrales de lluvia (`PRECAUCION` / `INUNDADO`) son **parámetros por municipio**, no constantes.

> Nota de coherencia: `IDEA.md` menciona Ahome / Los Mochis en seed, umbrales y fases.
> Ese era el alcance anterior. El alcance acordado es multi-municipio con demo en Guasave (D-007).
> `IDEA.md` no se modifica aquí; este documento prevalece para el alcance geográfico.

---

## 12. Qué NO incluye esta arquitectura

- Usuarios, login, JWT, refresh tokens, cookies de sesión, roles, bcrypt, sesiones.
- Multi-tenant / empresas.
- Redis (solo planificado, §10).
- Docker (fuera del MVP; se puede añadir después).
- Auditoría (`event_log`).
- Almacenamiento de fotos.
- CAPTCHA (pendiente de decisión explícita del equipo).

---

## 13. Relación con el molde base

| Del molde base | ¿Se conserva? |
|---|---|
| Prisma + PostgreSQL | Sí |
| Validation pipe + message factory | Sí |
| Filtro global de errores (Prisma/HTTP/unknown) | Sí |
| Envelope de error + requestId | Sí |
| Swagger | Sí |
| Env validada con zod | Sí |
| Throttler | Sí (con límites nuevos) |
| JwtAuthGuard / RolesGuard / @Public / @CurrentUser | **No** |
| TokenService, refresh rotation, cookies | **No** |
| `Usuario` / `SesionLogin` y schema `usuario` | **No** |
| password.service / bcrypt | **No** |
| `directUrl` multi-schema | **No** (schema único `public`) |

---

## 14. Verificación

Al implementar: `pnpm lint`, `npx tsc --noEmit`, `pnpm prisma validate`, `pnpm build`.
Los contratos de la API viven en `API_MANUAL.md` y deben mantenerse sincronizados con el código.
