# Developer V — Backend

> Reparto de tareas. Responsable de las **integraciones externas**, los **reportes ciudadanos**
> y los **crons**.
> Arquitectura de referencia: `ARCHITECTURE.md`. Contratos: `API_MANUAL.md`. Negocio: `IDEA.md`.

---

## 1. Rol

Clientes HTTP (Open-Meteo, Conagua), integración con Gemini, procesamiento EXIF, módulo
`reportes` y módulo `crons`.

Tus clientes **solo traen y normalizan datos**. Quien persiste es `crons`/`reportes`.
Los endpoints de lectura del mapa (`/mapa`, `/zonas`) y el módulo `admin` son de
`DEVELOPER_H`: tú **no** implementas lectura de mapa.

---

## 2. Archivos que puedes modificar

```
hackaton-backend/src/modules/
├── open-meteo/**
├── conagua/**
├── gemini/**
├── reportes/**
└── crons/**
```

Puedes agregar tests tuyos bajo cada módulo. Para dependencias de `package.json`
(`@google/genai`, `exifr`, `@nestjs/schedule`, etc.): pide aprobación antes de instalar.

## 3. Archivos que NO debes modificar

- `src/app.module.ts`, `src/bootstrap/**`, `src/config/**`, `src/common/**`,
  `src/prisma/**`, `modules/ubicacion/**`, `modules/zonas/**`, `modules/admin/**` → son de `DEVELOPER_H`.
- `prisma/schema.prisma` → de H. Si necesitas un campo nuevo, pídelo por §6; no lo edites tú.
- `docs/API_MANUAL.md` → contrato compartido; propón el cambio, no lo edites en solitario.
- Nada fuera de `hackaton-backend/`.

---

## 4. Tareas

### Fase 1 — Open-Meteo
- [ ] `OpenMeteoService.getLluviaZonas(zonas)` → batch de zonas en una petición (`IDEA.md` §4.1).
- [ ] Cálculo de `mm1h` y `mm24h` con verificación manual de índices antes de fiarse.
- [ ] `OpenMeteoService.getElevaciones(puntos)` → máximo 100 por petición (`§4.2`).
- [ ] Manejo del error `{ error, reason }` de elevation.
- [ ] Timeouts, reintentos limitados, sin reintentos en 4xx.

### Fase 2 — Reportes
- [ ] `GeminiService.clasificarFoto(buffer, mimeType)` con system instruction y structured output (`§4.4`).
- [ ] EXIF con `exifr` y regla de ±30 min (`§4.6`).
- [ ] `POST /reportes`: rate limit **2/15min por IP** → EXIF → contiene() → validar fecha →
      Gemini → guardar `Reporte` → responder `{ id, tipo, clasificacion, zonaId }`.
- [ ] Validar MIME por contenido, límite de tamaño, sin guardar la foto, sin loguear buffers.
- [ ] `GET /reportes?zonaId=&desde=`.

### Fase 3 — Crons
- [ ] `actualizarClima` (15 min): zonas → Open-Meteo → `LecturaClima(OPEN_METEO)` → estado con
      histéresis (2 lecturas seguidas para bajar) → lectura de apoyo Conagua.
- [ ] `reevaluarReportes` (10 min): `PENDIENTE` → `CORROBORADO` / `NO_CORROBORADO`; crea o
      renueva `ZonaRiesgo(INUNDACION, CLIMA, +3 días)`.
- [ ] `expirarRiesgos` (1 h): `activa = false` donde `INUNDACION` y `venceEn < ahora`.
- [ ] `revisarCiclones` (3 h) o plan demo manual.
- [ ] Umbrales parametrizados por municipio (demo: Mazatlán).

### Fase 4 — Conagua
- [ ] `ConaguaService` method=3: descomprimir gzip, parsear, filtrar por `ides`/`idmun`,
      `parseFloat(prec.trim())` (`§4.3`).
- [ ] **Confirmar el host completo antes de codificar** (`API_MANUAL.md` §7).
- [ ] Persistir `LecturaClima(CONAGUA)` de apoyo por municipio.

### Fase 5 — Ciclones
- [ ] Intentar fuente estable (Plan A) o caer a Plan B manual (`POST /admin/ciclon`, expuesto por H).
- [ ] `revisarCiclones` crea `ZonaRiesgo(INUNDACION, CICLON, +3 días)` + `Reporte(fuente: CICLON)`.

---

## 5. Notas y decisiones abiertas

- **Gemini:** confirmar nombre de modelo vigente y límites del plan gratuito antes de codificar.
- **Sin usuarios:** el spam se mitiga con throttler + validación; nunca subir a `INUNDADO`
  por un solo reporte.
- **Proveedores caídos:** conserva el último dato válido en BD; no inventes datos.
- **Fotos:** se procesan en memoria y se descartan. Sin persistencia, sin logs.
- **Caché futuro (Redis):** tras persistir en un cron, la invalidación de caché la definirá H.
  Tu cron no debe hablar con Redis directamente; expone un evento/callback si se acuerda en §6.

---

## 6. Dependencias

| De quién | Qué necesitas | Cuándo |
|---|---|---|
| `DEVELOPER_H` | `prisma/schema.prisma` migrado + `PrismaModule` global | Antes de Fase 2 y 3 |
| `DEVELOPER_H` | `@RateLimitEspecifico` y `@Admin()` disponibles | Antes de Fase 2 |
| `DEVELOPER_H` | Firma de `CronRunner.ejecutar(nombre)` y `CiclonesService.crearDesdeAdmin(dto)` | Antes de Fase 3 y 5 |

Si H aún no publicó una firma, no la inventes: anótala aquí y coordínate. Dos agentes no deben
modificar el mismo archivo a la vez.

---

## 7. Definición de terminado

- [ ] `pnpm lint` sin errores.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `pnpm build` correcto.
- [ ] Sin `any` sin justificación, sin secretos en el repo.
- [ ] Timeouts y manejo de errores probados en cada integración.
- [ ] Contratos en `API_MANUAL.md` coinciden con lo implementado.

---

## 8. Reglas no negociables

1. **Nunca hagas commit sin permiso explícito del usuario.**
2. No agregues dependencias sin justificar y pedir aprobación.
3. No inventes endpoints ni campos fuera de `API_MANUAL.md` / `IDEA.md`.
4. No modifiques archivos de `DEVELOPER_H` ni nada fuera de `hackaton-backend/`.
5. No escribas en `prisma/schema.prisma`; solicita el cambio a H.
6. Mantén la app compilable en cada cambio.
7. Sin credenciales ni claves reales en código o documentación.
