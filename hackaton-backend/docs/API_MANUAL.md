# Manual de APIs — AquaReport

> Contrato global. Cubre **la API propia de AquaReport** (consumida por el frontend) y
> **las APIs externas** (consumidas por el backend).
> Basado en lo documentado en `IDEA.md` §4 y §7. **No se inventan campos**: todo lo no
> verificado queda marcado como `PENDIENTE DE VALIDACIÓN`.

---

## 1. Convenciones generales

| Tema                 | Convención                                 |
| -------------------- | ------------------------------------------ |
| Prefijo              | `/api/v1`                                  |
| Formato respuesta    | `application/json`                         |
| Envío de foto        | `multipart/form-data`                      |
| Fechas               | ISO 8601 (`2026-10-15T19:45:00.000Z`)      |
| Coordenadas          | `lat` ∈ [-90, 90], `lng` ∈ [-180, 180]     |
| Slug                 | minúsculas, sin acentos, separados por `-` |
| Enum ausente en JSON | campo omitido o `null`, nunca cadena vacía |
| Versionado           | rompimiento de contrato ⇒ sube a `/api/v2` |

### Envelope de error (todas las respuestas de error)

```json
{
  "requestId": "uuid",
  "code": "CODIGO_DE_ERROR",
  "message": "Mensaje legible en español.",
  "statusCode": 400,
  "timestamp": "2026-10-15T19:45:00.000Z",
  "path": "/api/v1/ruta",
  "details": null
}
```

### Códigos HTTP usados

| Código | Cuándo                                                   |
| ------ | -------------------------------------------------------- |
| 400    | Validación de DTO, coordenadas inválidas, fecha inválida |
| 403    | `x-api-key` ausente o inválida                           |
| 404    | Municipio o zona inexistente                             |
| 413    | Foto demasiado grande                                    |
| 415    | Tipo MIME no permitido                                   |
| 429    | Rate limit excedido (incluye `Retry-After`)              |
| 500    | Error interno                                            |
| 503    | Proveedor externo caído (cuando aplique)                 |

### Rate limits por endpoint

| Endpoint                | Límite |    TTL |
| ----------------------- | -----: | -----: |
| `POST /reportes`        |      2 | 15 min |
| `/admin/*`              |     40 | 15 min |
| Resto de la API pública |    100 |  1 min |

---

## 2. Tipos compartidos (respuesta de AquaReport)

```ts
type EstadoZona = 'SIN_DATOS' | 'NORMAL' | 'PRECAUCION' | 'INUNDADO';
type MotivoRiesgo = 'ALTURA' | 'INUNDACION';
type OrigenRiesgo = 'MANUAL' | 'CICLON' | 'CLIMA';
type TipoReporte = 'CORROBORADO' | 'PENDIENTE' | 'NO_CORROBORADO';
type ClasificacionIA = 'INUNDADO' | 'PARCIAL' | 'NO_INUNDADO';
type FuenteReporte = 'CIUDADANO' | 'CICLON';

interface ZonaMapa {
  id: number;
  latCentro: number;
  lngCentro: number;
  ladoM: number;
  estado: EstadoZona;
  mm1h: number;
  mm24h: number;
}

interface ZonaRiesgoMapa {
  id: number;
  lat: number;
  lng: number;
  radioM: number;
  motivo: MotivoRiesgo;
  origen: OrigenRiesgo;
  venceEn: string | null; // null = permanente (motivo ALTURA)
}

interface MapaResponse {
  municipio: string; // slug
  actualizadoEn: string; // ISO 8601
  zonas: ZonaMapa[];
  zonasRiesgo: ZonaRiesgoMapa[]; // solo activas = true
}
```

---

## 3. API propia — endpoints públicos

### `GET /api/v1/health`

|            |         |
| ---------- | ------- |
| Acceso     | Público |
| Rate limit | global  |

Respuesta `200`:

```json
{ "status": "ok", "timestamp": "2026-10-15T19:45:00.000Z" }
```

---

### `GET /api/v1/mapa/:municipioSlug`

|            |                                             |
| ---------- | ------------------------------------------- |
| Acceso     | Público                                     |
| Rate limit | global                                      |
| Fuente     | **Solo PostgreSQL** (sin llamadas externas) |

**Request**

| Param           | Tipo          | Requerido | Descripción                        |
| --------------- | ------------- | --------- | ---------------------------------- |
| `municipioSlug` | string (path) | Sí        | Slug del municipio, ej. `mazatlan` |

**Response `200`** — `MapaResponse`:

```json
{
  "municipio": "mazatlan",
  "actualizadoEn": "2026-10-15T19:45:00Z",
  "zonas": [
    {
      "id": 1,
      "latCentro": 23.22,
      "lngCentro": -106.42,
      "ladoM": 9000,
      "estado": "PRECAUCION",
      "mm1h": 22.5,
      "mm24h": 41.0
    }
  ],
  "zonasRiesgo": [
    {
      "id": 7,
      "lat": 23.25,
      "lng": -106.41,
      "radioM": 500,
      "motivo": "ALTURA",
      "origen": "MANUAL",
      "venceEn": null
    }
  ]
}
```

**Errores**: `404 MUNICIPIO_NO_ENCONTRADO`.

> Frontend: dibujar zonas con `L.rectangle(limites(z))` y riesgos con `L.circle`.

---

### `POST /api/v1/reportes`

|                 |                                         |
| --------------- | --------------------------------------- |
| Acceso          | Público (anónimo)                       |
| Rate limit      | **2 cada 15 min por IP**                |
| Content-Type    | `multipart/form-data`                   |
| Llamada externa | Gemini (síncrona)                       |
| Foto            | Se procesa en memoria, **no se guarda** |

**Request — campos**

| Campo  | Tipo   | Requerido | Validación                                                                   |
| ------ | ------ | --------- | ---------------------------------------------------------------------------- |
| `foto` | file   | Sí        | JPEG/PNG/WebP/HEIC/HEIF; MIME y contenido reales; límite de tamaño (ver env) |
| `lat`  | number | Sí        | Dentro de una zona existente                                                 |
| `lng`  | number | Sí        | Dentro de una zona existente                                                 |

**Pasos internos**: rate limit → leer EXIF (`DateTimeOriginal`) → verificar que `(lat,lng)` cae
en una zona (`contiene`) → validar `ahora - (fechaFoto ?? ahora) <= 30 min` → clasificar con
Gemini → guardar `Reporte`.

**Response `201`**:

```json
{
  "id": 123,
  "tipo": "PENDIENTE",
  "clasificacion": "INUNDADO",
  "zonaId": 1
}
```

```ts
interface ReporteCreadoResponse {
  id: number;
  tipo: TipoReporte;
  clasificacion: ClasificacionIA;
  zonaId: number;
}
```

**Errores**:

| Código                    | HTTP    | Causa                                          |
| ------------------------- | ------- | ---------------------------------------------- |
| `RATE_LIMIT_EXCEEDED`     | 429     | Ya se usaron los 2 intentos del cuarto de hora |
| `REPORT_FUERA_DE_ZONA`    | 400     | Las coordenadas no caen en ninguna zona        |
| `REPORT_FECHA_INVALIDA`   | 400     | Foto con más de 30 min (por EXIF o servidor)   |
| `REPORT_ARCHIVO_INVALIDO` | 415/413 | MIME, contenido o tamaño inválido              |
| `GEMINI_NO_DISPONIBLE`    | 503     | El clasificador no respondió                   |

---

### `GET /api/v1/reportes`

|            |         |
| ---------- | ------- |
| Acceso     | Público |
| Rate limit | global  |

**Query**

| Param    | Tipo            | Requerido | Descripción              |
| -------- | --------------- | --------- | ------------------------ |
| `zonaId` | number          | No        | Filtra por zona          |
| `desde`  | string ISO 8601 | No        | Fecha mínima de creación |

**Response `200`**:

```json
{
  "reportes": [
    {
      "id": 123,
      "zonaId": 1,
      "fuente": "CIUDADANO",
      "tipo": "CORROBORADO",
      "clasificacion": "INUNDADO",
      "lat": 23.22,
      "lng": -106.42,
      "fechaFoto": "2026-10-15T19:30:00.000Z",
      "creadoEn": "2026-10-15T19:35:00.000Z"
    }
  ]
}
```

> Nota: los campos expuestos al mapa derivan de `userLat` / `userLng` del modelo `Reporte`.
> Nombre público `lat`/`lng` — confirmar al implementar si se expone la posición exacta del
> reportero o solo la zona. `PENDIENTE DE VALIDACIÓN`.

---

### `GET /api/v1/zonas/:id`

|            |         |
| ---------- | ------- |
| Acceso     | Público |
| Rate limit | global  |

**Response `200`**: detalle de la zona con sus últimas lecturas.

```json
{
  "id": 1,
  "municipioSlug": "mazatlan",
  "latCentro": 23.22,
  "lngCentro": -106.42,
  "ladoM": 9000,
  "estado": "PRECAUCION",
  "mm1h": 22.5,
  "mm24h": 41.0,
  "lecturas": [
    {
      "id": 55,
      "mm1h": 22.5,
      "mm24h": 41.0,
      "fuente": "OPEN_METEO",
      "creadoEn": "2026-10-15T19:45:00.000Z"
    }
  ]
}
```

> La forma exacta del array `lecturas` (cuántas últimas) es `PENDIENTE DE VALIDACIÓN`.

**Errores**: `404 ZONA_NO_ENCONTRADA`.

---

### `GET /api/v1/alertas/ciclon` (opcional)

|        |                                                          |
| ------ | -------------------------------------------------------- |
| Acceso | Público                                                  |
| Estado | **OPCIONAL** — solo si hay fuente de ciclones confirmada |

`PENDIENTE DE VALIDACIÓN`: no hay API JSON de ciclones confirmada (ver §5.3). El plan demo es
registrar ciclones a mano por `/admin/ciclon`.

---

## 4. API propia — administración

Todas requieren header `x-api-key` (igual a `ADMIN_API_KEY`). Rate limit 40 cada 15 min
(configurable con `RATE_LIMIT_ADMIN_LIMIT` / `RATE_LIMIT_ADMIN_TTL_MS`; pensado para poder
subirlo o desactivarlo durante pruebas, ya que la protección real es la API key).

| Método | Ruta                                  | Body                                 | Efecto                                   |
| ------ | ------------------------------------- | ------------------------------------ | ---------------------------------------- |
| POST   | `/api/v1/admin/simular-lluvia`        | `{ zonaId, mm1h, mm24h }`            | Fuerza lectura/clima para la demo        |
| POST   | `/api/v1/admin/cron/:nombre`          | —                                    | Ejecuta un cron a mano                   |
| POST   | `/api/v1/admin/zonas/generar`         | `{ municipioSlug, sw, ne }`          | Genera malla de zonas en un bounding box |
| POST   | `/api/v1/admin/riesgo-altura/:zonaId` | —                                    | Corre el cálculo de riesgo por elevación |
| POST   | `/api/v1/admin/ciclon`                | `{ lat, lng, categoria, vientoKmh }` | Registra un ciclón manualmente           |

**Errores admin**:

| Código                    | HTTP |
| ------------------------- | ---- |
| `ADMIN_KEY_INVALIDA`      | 403  |
| `MUNICIPIO_NO_ENCONTRADO` | 404  |
| `ZONA_NO_ENCONTRADA`      | 404  |

> `nombre` en `/admin/cron/:nombre` debe validarse contra una lista cerrada
> (`actualizarClima`, `reevaluarReportes`, `expirarRiesgos`, `revisarCiclones`); no ejecutar
> nombres arbitrarios.

---

## 5. APIs externas

Regla general: los clientes externos solo **traen y normalizan**. Quien persiste son `crons`,
`reportes` y `admin`.

### 5.1 Open-Meteo — Forecast (lluvia)

|                  |                                                  |
| ---------------- | ------------------------------------------------ |
| Método / URL     | `GET https://api.open-meteo.com/v1/forecast`     |
| Auth             | Ninguna                                          |
| Credencial       | No                                               |
| Uso no comercial | Sí, con atribución. Límite < 10,000 llamadas/día |

**Datos enviados**

| Parámetro        | Ejemplo               | Para qué                  |
| ---------------- | --------------------- | ------------------------- |
| `latitude`       | `23.22,23.31,...`     | Varias zonas por petición |
| `longitude`      | `-106.42,-106.33,...` | Mismo orden que latitude  |
| `hourly`         | `precipitation`       | mm por hora               |
| `past_hours`     | `24`                  | Últimas 24 h              |
| `forecast_hours` | `1`                   | Hora actual / próxima     |
| `models`         | `ecmwf_ifs`           | Celda estable ~9 km       |
| `cell_selection` | `nearest`             | Celda más cercana         |
| `timezone`       | `America/Mazatlan`    | Hora local                |

**Respuesta original relevante** (arreglo, uno por coordenada):

```json
{
  "latitude": 23.22,
  "longitude": -106.42,
  "hourly": {
    "time": ["2026-10-15T12:00", "..."],
    "precipitation": [0.0, 2.5]
  }
}
```

**Normalización interna**

| Salida  | Cálculo                           |
| ------- | --------------------------------- |
| `mm1h`  | `precipitation` de la hora actual |
| `mm24h` | suma de las últimas 24 horas      |

**Persistido**: `LecturaClima { mm1h, mm24h, fuente: OPEN_METEO }` + actualiza `Zona`.
**Descartado**: el resto del payload horario.
**Errores/timeouts**: timeout configurable, reintentos limitados; ante fallo se conserva el
último dato válido en BD.

> `mm1h`/`mm24h` son de un **modelo de pronóstico**, no mediciones de pluviómetro.

---

### 5.2 Open-Meteo — Elevation

|              |                                               |
| ------------ | --------------------------------------------- |
| Método / URL | `GET https://api.open-meteo.com/v1/elevation` |
| Auth         | Ninguna                                       |
| Máximo       | 100 coordenadas por petición                  |
| Datos        | Copernicus DEM GLO-90 (~90 m), con atribución |

**Datos enviados**: `latitude`, `longitude` (hasta 100).

**Respuesta original**:

```json
{ "elevation": [38.0, 41.5] }
```

**Normalización interna**: elevación por punto → mediana de la zona → marca puntos
`elevacion < mediana - umbral` como riesgo.
**Persistido**: `ZonaRiesgo { motivo: ALTURA, origen: MANUAL, radioM: 500, venceEn: null }`
(vía `/admin/riesgo-altura/:zonaId`).
**Errores**: HTTP 400 con `{ "error": true, "reason": "..." }` → traducir a error interno.

---

### 5.3 Conagua / SMN

| Servicio        | Ruta                               | Contenido                    |
| --------------- | ---------------------------------- | ---------------------------- |
| Diario (3 días) | `/tools/GUI/webservices/?method=1` | Pronóstico por día           |
| Por hora (48 h) | `/tools/GUI/webservices/?method=3` | Pronóstico por hora          |
| Ciclones        | —                                  | **Sin API JSON documentada** |

- **Host**: `https://smn.conagua.gob.mx` — **HOST PENDIENTE DE VALIDACIÓN** (probar antes de codificar).
- **Auth**: ninguna.
- **Formato**: JSON comprimido (gzip) → descomprimir antes de parsear.
- **Volumen**: devuelve **todos los municipios del país**; filtrar por `ides` + `idmun`
  (guardados en `Municipio.idEstadoSmn` / `Municipio.idMunSmn`).

**Datos enviados**: solo la petición HTTP (sin parámetros de filtro; el filtro es local).

**Campos útiles (method=3)**

| Campo        | Tipo                | Significado                                 |
| ------------ | ------------------- | ------------------------------------------- |
| `ides`       | number/string       | id de estado                                |
| `idmun`      | number/string       | id de municipio                             |
| `nes`        | string              | nombre de estado                            |
| `nmun`       | string              | nombre de municipio                         |
| `hloc`       | string              | hora local, ej. `20200812T20`               |
| `nhor`       | number              | número de hora                              |
| `prec`       | string con espacios | litros/m² = mm → `parseFloat(valor.trim())` |
| `probprec`   | string              | probabilidad de precipitación (%)           |
| `lat`, `lon` | number              | coordenadas del municipio                   |

**Normalización interna**: `prec` → mm por municipio.
**Persistido**: `LecturaClima { fuente: CONAGUA }` de apoyo.
**Ciclones**: sin API confirmada → plan demo es `/admin/ciclon` manual (registro a mano).

---

### 5.4 Gemini — clasificación de foto

|               |                                                                                    |
| ------------- | ---------------------------------------------------------------------------------- |
| SDK           | `@google/genai`                                                                    |
| Credencial    | `GEMINI_API_KEY` (solo backend)                                                    |
| Modelo        | **PENDIENTE DE VALIDACIÓN** (confirmar nombre vigente y límites del plan gratuito) |
| Formatos      | `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`                |
| Imagen        | inline base64; petición total < 20 MB                                              |
| Foto guardada | **Nunca**                                                                          |

**Datos enviados**: solo la imagen (`inlineData { mime_type, data }`).

- **System instruction** (una sola vez, en configuración): rol de clasificador de calles,
  reglas `INUNDADO` / `PARCIAL` / `NO_INUNDADO`, respuesta solo con el JSON del esquema.
- **Structured output**: esquema JSON `{ clasificacion: 'INUNDADO' | 'PARCIAL' | 'NO_INUNDADO' }`.

**Respuesta original relevante**: JSON con `clasificacion`.

**Normalización interna**: mapeo directo a `ClasificacionIA`.
**Persistido**: `Reporte.clasificacion` (foto descartada).
**Errores/timeouts**: timeout, reintento limitado, sin fallback que invente clasificación;
si falla → `GEMINI_NO_DISPONIBLE` (503).

**Regla de corroboración** (evalúa el cron `reevaluarReportes`):

| Condición                                            | `TipoReporte`    |
| ---------------------------------------------------- | ---------------- |
| Falta lectura reciente                               | `PENDIENTE`      |
| Foto `INUNDADO`/`PARCIAL` + lluvia reciente > umbral | `CORROBORADO`    |
| Foto `INUNDADO` con lluvia poca/nula                 | `NO_CORROBORADO` |

---

### 5.5 EXIF (entrada local, no es HTTP)

```ts
import exifr from 'exifr';
const meta = await exifr.parse(buffer, ['DateTimeOriginal']);
const fechaFoto: Date | undefined = meta?.DateTimeOriginal;
```

- Fecha en hora local del teléfono, sin zona horaria → comparar con hora de Sinaloa.
- Sin EXIF (WhatsApp, captura) → usar hora del servidor.
- Recomendado: capturar con la cámara de la app (`capture="environment"`).

---

## 6. Reglas de seguridad del contrato

1. El frontend **solo** consume la API de AquaReport. Nunca ve `GEMINI_API_KEY` ni `ADMIN_API_KEY`.
2. Las claves viajan solo por variables de entorno, nunca en Git ni en respuestas.
3. Las respuestas externas se validan antes de persistirse.
4. Las fotos no se almacenan ni se registran en logs.
5. PostgreSQL es la fuente de verdad; el caché (Redis futuro) es solo aceleración y debe
   degradar a BD si falla.
6. Ningún endpoint de lectura invoca proveedores externos en la petición.

---

## 7. Pendientes de validación antes de codificar

- [ ] Host completo del web service de Conagua.
- [ ] Modelo de Gemini vigente y límites del plan gratuito.
- [ ] Límite exacto de tamaño de archivo para `foto` (configurable por env).
- [ ] Si `GET /reportes` expone coordenada exacta o solo la zona.
- [ ] Umbral de lluvia por municipio (parámetro, no constante).
- [ ] CAPTCHA (Turnstile) en `POST /reportes`.
