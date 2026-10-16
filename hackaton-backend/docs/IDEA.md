# Alerta Inundaciones — Manual técnico v2 (para codificar)

> **NOTA DE ALCANCE (oct. 2026):** el alcance geográfico acordado es **multi-municipio**, con
> **demo en Mazatlán**. Las menciones a Ahome / Los Mochis de este documento (seed, umbrales,
> fases) corresponden al alcance anterior y deben interpretarse como parametrizables por
> municipio. Ver `ARCHITECTURE.md` §11. La arquitectura y los contratos viven en
> `ARCHITECTURE.md` y `API_MANUAL.md`; este documento es la especificación funcional original.

> Stack: NestJS + Prisma + PostgreSQL + `@nestjs/schedule` + `@nestjs/throttler` + `exifr` + `@google/genai` + Leaflet.
> Sin usuarios. No se guardan fotos. Fecha de referencia: octubre 2026.

---

## 0. Glosario rápido

| Término                | Qué es                                                                                                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EXIF**               | Metadatos que la cámara del celular guarda dentro del archivo de la foto: fecha y hora de captura, modelo del teléfono y, a veces, GPS. Nos sirve para saber **cuándo** se tomó la foto (`DateTimeOriginal`). No es confiable al 100%: se puede editar y muchas apps lo borran. |
| **DEM**                | Digital Elevation Model (modelo digital de elevación): un mapa que dice la altura del terreno en cada punto. Open-Meteo usa Copernicus GLO-90 (un dato cada 90 m). Es la **fuente** de las alturas, ya no es un valor del enum de origen.                                       |
| **mm de lluvia**       | 1 mm = 1 litro por m². Es lo mismo que "litros/m²" que usa Conagua.                                                                                                                                                                                                             |
| **mm1h**               | Lluvia de la última hora (mm).                                                                                                                                                                                                                                                  |
| **mm24h**              | Lluvia acumulada de las últimas 24 horas (mm).                                                                                                                                                                                                                                  |
| **Zona**               | Cuadro de ~9 km que equivale a una celda del modelo ECMWF IFS de Open-Meteo.                                                                                                                                                                                                    |
| **Zona de riesgo**     | Círculo (centro + radio) donde se espera que la situación sea peor, por altura o por inundación reciente.                                                                                                                                                                       |
| **System instruction** | Instrucciones fijas que se configuran una sola vez en el servicio de Gemini (rol, reglas, formato) y no se repiten en cada llamada.                                                                                                                                             |

---

## 1. Módulos

```
src/
├─ ubicacion/    Pais, Estado, Municipio
├─ zonas/        Zona y ZonaRiesgo (lectura, generación, seed de altura)
├─ open-meteo/   Cliente HTTP: lluvia y elevación (sin DB)
├─ conagua/      Cliente HTTP: pronóstico municipal y ciclones (sin DB)
├─ gemini/       Cliente de Gemini: clasifica la foto (sin DB)
├─ crons/        Tareas programadas (usan los servicios y guardan en DB)
├─ reportes/     API pública principal
└─ admin/        Endpoints protegidos con API key (demo)
```

Regla: los módulos cliente (`open-meteo`, `conagua`, `gemini`) solo traen y normalizan datos. `crons` y `reportes` deciden y guardan.

---

## 2. Base de datos (Prisma)

```prisma
enum EstadoZona      { SIN_DATOS NORMAL PRECAUCION INUNDADO }
enum MotivoRiesgo    { ALTURA INUNDACION }
enum OrigenRiesgo    { MANUAL CICLON CLIMA }
enum FuenteClima     { CONAGUA OPEN_METEO }
enum TipoReporte     { CORROBORADO PENDIENTE NO_CORROBORADO }
enum ClasificacionIA { INUNDADO PARCIAL NO_INUNDADO }
enum FuenteReporte   { CIUDADANO CICLON }

model Pais {
  id      Int      @id @default(autoincrement())
  nombre  String   @unique
  estados Estado[]
}

model Estado {
  id         Int         @id @default(autoincrement())
  nombre     String
  paisId     Int
  pais       Pais        @relation(fields: [paisId], references: [id])
  municipios Municipio[]
  @@unique([paisId, nombre])
}

model Municipio {
  id        Int          @id @default(autoincrement())
  nombre    String
  slug      String       @unique
  idEstadoSmn Int?                    // "ides" del web service de Conagua
  idMunSmn    Int?                    // "idmun" del web service de Conagua
  estadoId  Int
  estado    Estado       @relation(fields: [estadoId], references: [id])
  zonas     Zona[]
  riesgos   ZonaRiesgo[]
  @@unique([estadoId, nombre])
}

model Zona {
  id            Int            @id @default(autoincrement())
  municipioId   Int
  municipio     Municipio      @relation(fields: [municipioId], references: [id])
  latCentro     Float
  lngCentro     Float
  ladoM         Int            @default(9000)
  modelo        String         @default("ecmwf_ifs")
  latModelo     Float?
  lngModelo     Float?
  estado        EstadoZona     @default(SIN_DATOS)
  mm1h          Float          @default(0)
  mm24h         Float          @default(0)
  creadoEn      DateTime       @default(now())
  actualizadoEn DateTime       @updatedAt
  lecturas      LecturaClima[]
  reportes      Reporte[]
  @@unique([latCentro, lngCentro, modelo])
  @@index([municipioId])
}

model LecturaClima {
  id       Int          @id @default(autoincrement())
  zonaId   Int
  zona     Zona         @relation(fields: [zonaId], references: [id])
  mm1h     Float
  mm24h    Float
  fuente   FuenteClima
  creadoEn DateTime     @default(now())
  @@index([zonaId, creadoEn])
}

model ZonaRiesgo {
  id          Int          @id @default(autoincrement())
  municipioId Int
  municipio   Municipio    @relation(fields: [municipioId], references: [id])
  lat         Float
  lng         Float
  radioM      Int
  motivo      MotivoRiesgo
  origen      OrigenRiesgo
  activa      Boolean      @default(true)
  creadoEn    DateTime     @default(now())
  venceEn     DateTime?
  @@index([municipioId, activa])
}

model Reporte {
  id            Int              @id @default(autoincrement())
  zonaId        Int
  zona          Zona             @relation(fields: [zonaId], references: [id])
  fuente        FuenteReporte    @default(CIUDADANO)
  tipo          TipoReporte      @default(PENDIENTE)
  clasificacion ClasificacionIA?
  userLat       Float?
  userLng       Float?
  fechaFoto     DateTime?
  creadoEn      DateTime         @default(now())
  @@index([zonaId, creadoEn])
}
```

### Cómo se usan los enums de origen

- `MANUAL`: zonas creadas por nosotros (seed manual, script de altura que corremos a mano, puntos conocidos).
- `CLIMA`: creadas automáticamente por un cron por lluvia fuerte o por reportes corroborados con datos del clima.
- `CICLON`: creadas por el cron de ciclones.
- El **motivo** (`ALTURA` / `INUNDACION`) dice _por qué_ es riesgo; el **origen** dice _quién la creó_.

### Vencimiento

- `ALTURA`: `venceEn = null` (permanente).
- `INUNDACION`: `venceEn = ahora + 3 días`. Cada nueva evidencia (lluvia fuerte o reporte corroborado) renueva `venceEn`.
- Expirar = `activa = false` (no se borra, queda historial).

---

## 3. Cálculo de límites (cuadro por centro y lado)

Se considera correcto para áreas pequeñas (error menor al 1%):

```ts
const M_POR_GRADO = 111_320;

export function mitadesEnGrados(lat: number, ladoM: number) {
  const mitad = ladoM / 2;
  return {
    dLat: mitad / M_POR_GRADO,
    dLng: mitad / (M_POR_GRADO * Math.cos((lat * Math.PI) / 180)),
  };
}
export function contiene(
  z: { latCentro: number; lngCentro: number; ladoM: number },
  lat: number,
  lng: number,
) {
  const { dLat, dLng } = mitadesEnGrados(z.latCentro, z.ladoM);
  return (
    Math.abs(lat - z.latCentro) <= dLat && Math.abs(lng - z.lngCentro) <= dLng
  );
}
export function limites(z: {
  latCentro: number;
  lngCentro: number;
  ladoM: number;
}) {
  const { dLat, dLng } = mitadesEnGrados(z.latCentro, z.ladoM);
  return [
    [z.latCentro - dLat, z.lngCentro - dLng],
    [z.latCentro + dLat, z.lngCentro + dLng],
  ];
}
```

Nota: el modelo ECMWF IFS HRES de Open-Meteo usa una malla gaussiana reducida (O1280) de ~9 km, no una cuadrícula regular exacta. Nuestros cuadros son una aproximación; se verifica con `latModelo/lngModelo`.

---

## 4. APIs externas (referencia exacta)

### 4.1 Open-Meteo — lluvia

- **Método:** `GET https://api.open-meteo.com/v1/forecast`
- **Auth:** ninguna (uso no comercial, menos de 10,000 llamadas al día, con atribución).
- **Parámetros que usaremos:**

| Parámetro        | Valor                                | Para qué                                              |
| ---------------- | ------------------------------------ | ----------------------------------------------------- |
| `latitude`       | `25.79,25.87,...`                    | Varias zonas en una sola petición, separadas por coma |
| `longitude`      | `-108.99,-108.90,...`                | Mismo orden que latitude                              |
| `hourly`         | `precipitation`                      | Suma de lluvia de la hora previa, en mm               |
| `past_hours`     | `24`                                 | Incluye las últimas 24 horas                          |
| `forecast_hours` | `1` (o más si queremos próxima hora) | Limita las horas hacia adelante                       |
| `models`         | `ecmwf_ifs`                          | Fija el modelo de 9 km (para que la celda no cambie)  |
| `cell_selection` | `nearest`                            | Usa la celda más cercana (por defecto sería `land`)   |
| `timezone`       | `America/Mazatlan`                   | Horas locales de Sinaloa                              |

- **Ejemplo:**

```
https://api.open-meteo.com/v1/forecast?latitude=25.79,25.87&longitude=-108.99,-108.90&hourly=precipitation&past_hours=24&forecast_hours=1&models=ecmwf_ifs&cell_selection=nearest&timezone=America/Mazatlan
```

- **Respuesta:** con varias coordenadas regresa un **arreglo** de objetos, uno por coordenada (mismo orden). Cada uno trae `latitude`, `longitude` (la celda resuelta) y `hourly.time[]` / `hourly.precipitation[]`.
- **Cómo sacar mm1h y mm24h:**
  - `mm1h` = valor de `precipitation` de la hora actual (último elemento si `forecast_hours=1`).
  - `mm24h` = suma de las últimas 24 horas hasta la actual.
  - Verifica los índices con una llamada de prueba antes de fiarte.
- **Ojo:** estos valores son de un modelo de pronóstico, no una medición de pluviómetro.

### 4.2 Open-Meteo — elevación

- **Método:** `GET https://api.open-meteo.com/v1/elevation`
- **Parámetros:** `latitude` y `longitude` (hasta **100 coordenadas** separadas por coma).
- **Respuesta:** `{ "elevation": [38.0, 41.5, ...] }` (siempre arreglo, en metros).
- **Datos:** Copernicus DEM GLO-90 (90 m). Hay que dar atribución a Copernicus y a Open-Meteo.
- **Error:** HTTP 400 con `{ "error": true, "reason": "..." }`.

### 4.3 Conagua / SMN — pronóstico por municipio

Dos servicios (los datos se actualizan cada hora y 15 minutos):

| Servicio        | Ruta                               | Contenido           |
| --------------- | ---------------------------------- | ------------------- |
| Diario (3 días) | `/tools/GUI/webservices/?method=1` | Pronóstico por día  |
| Por hora (48 h) | `/tools/GUI/webservices/?method=3` | Pronóstico por hora |

- **Host:** `https://smn.conagua.gob.mx` (la documentación muestra solo la ruta relativa; **confirma la URL completa** probándola en el navegador).
- **Formato:** JSON, pero el servicio se llama "PronosticoPorMunicipiosGZ": probablemente llega **comprimido (gzip)**; descomprime antes de parsear.
- **Importante:** devuelve **todos los municipios del país** en un solo archivo. Filtra por `ides` (estado) e `idmun` (municipio). Por eso guardamos `idEstadoSmn` e `idMunSmn` en `Municipio`.
- **Campos útiles (method=3, por hora):**

| Campo           | Qué es                            |
| --------------- | --------------------------------- |
| `ides`, `idmun` | Id de estado y municipio          |
| `nes`, `nmun`   | Nombre de estado y municipio      |
| `hloc`          | Hora local (ej. `20200812T20`)    |
| `nhor`          | Número de hora                    |
| `prec`          | Precipitación en litros/m² (= mm) |
| `probprec`      | Probabilidad de precipitación (%) |
| `lat`, `lon`    | Coordenadas del municipio         |

- **Ojo:** los valores vienen como **texto con espacios** (ej. `" 0.88"`). Usa `parseFloat(valor.trim())`.
- **Uso en la app:** refuerzo por municipio, no por zona. Dato de apoyo en `LecturaClima` con `fuente = CONAGUA`.

### 4.4 Conagua / SMN — ciclones

- Los avisos de ciclón se publican en el portal del SMN (sección de ciclones tropicales), pero **no encontré una API JSON documentada**.
- **Plan A:** revisar el portal del SMN y ver si hay un archivo/endpoint estable (inspeccionar la pestaña Network del navegador).
- **Plan B (demo):** `POST /admin/ciclon` con `{lat, lng, categoria, vientoKmh}` registrado a mano. Este plan debe existir sí o sí.

### 4.5 Gemini (Google AI Studio) — clasificar la foto

- **Credencial:** API key de Google AI Studio en variable de entorno `GEMINI_API_KEY` (solo en el backend, nunca en el front, nunca en git).
- **SDK:** `@google/genai`.
- **Modelo:** la documentación actual usa `gemini-3.8-flash` en sus ejemplos. **Confirma el nombre del modelo y los límites de uso gratuito en AI Studio** el día que programes.
- **Formatos de imagen válidos:** `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`.
- **Imagen inline:** base64, el total de la petición no debe pasar de 20 MB (nosotros mandamos la foto desde memoria, sin guardarla).
- **Salida estructurada:** se configura un esquema JSON para que la respuesta sea siempre válida.

**Dónde va cada cosa (lo que preguntaste):**

| Va en la configuración del servicio (una sola vez)                   | Va en cada llamada                |
| -------------------------------------------------------------------- | --------------------------------- |
| Instrucciones del rol y reglas de clasificación (system instruction) | Solo la imagen (y su `mime_type`) |
| Esquema JSON de salida (`INUNDADO / PARCIAL / NO_INUNDADO`)          |                                   |
| Modelo y parámetros                                                  |                                   |

**System instruction sugerida:**

```
Eres un clasificador de fotos de calles para una app de alertas de inundación.
Recibes UNA foto. Clasifícala como:
- INUNDADO: agua cubriendo la calle o banqueta de forma evidente (acumulación, corriente, vehículos o casas con agua).
- PARCIAL: charcos grandes o agua en partes de la calle, pero transitable.
- NO_INUNDADO: no hay agua acumulada relevante, o la imagen no muestra una calle/zona exterior.
Responde solo con el JSON del esquema. No expliques.
```

**Esqueleto (confirma la sintaxis en la doc vigente):**

```ts
@Injectable()
export class GeminiService {
  private client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  private readonly SYSTEM = `...(la instrucción de arriba)...`;
  private readonly SCHEMA = {
    type: "object",
    properties: {
      clasificacion: {
        type: "string",
        enum: ["INUNDADO", "PARCIAL", "NO_INUNDADO"],
      },
    },
    required: ["clasificacion"],
  };

  async clasificarFoto(buffer: Buffer, mimeType: string) {
    // La llamada solo manda la imagen; las reglas y el esquema ya están en la config del servicio.
    // (Parámetros exactos: ver "System instructions" y "Structured output" en la doc de Gemini.)
  }
}
```

### 4.6 EXIF — `exifr`

```ts
import exifr from "exifr";
const meta = await exifr.parse(buffer, ["DateTimeOriginal"]);
const fechaFoto: Date | undefined = meta?.DateTimeOriginal;
```

- La fecha EXIF viene en hora local del teléfono, sin zona horaria: compárala con la hora de Sinaloa.
- Si no hay EXIF (WhatsApp, capturas de pantalla), usa la hora del servidor.
- Mejor: tomar la foto con la cámara dentro de la app (`<input type="file" accept="image/*" capture="environment">`).

---

## 5. Cómo se calculan las zonas de riesgo por altura

Objetivo: marcar puntos que están **más bajos que su entorno**.

1. Por cada zona (cuadro de 9 km) generar una malla de puntos cada **1 km** (9×9 = 81 puntos, cabe en una sola petición de 100 coordenadas).
2. Pedir sus elevaciones a Open-Meteo (`/v1/elevation`).
3. Calcular la **mediana** de elevación de la zona (y/o del municipio).
4. Marcar un punto como riesgo si `elevacion < mediana - umbral` (por ejemplo, 1 a 2 m en terreno plano, o el percentil 20 más bajo).
5. Guardar cada punto marcado como `ZonaRiesgo` con `motivo = ALTURA`, `origen = MANUAL`, `radioM = 500` y `venceEn = null`. Se corre a mano (una vez, o cuando cambie algo).

**Advertencias honestas:**

- Los Mochis y el valle de Ahome son muy planos. Las diferencias de 1–3 m están cerca del error del DEM, así que el resultado puede ser ruidoso.
- Un punto bajo no siempre se inunda (depende de drenaje y canales). Complementa con puntos conocidos a mano (`origen = MANUAL`), que probablemente valen más.
- Para la demo, revisa visualmente el mapa y ajusta el umbral.

---

## 6. Crons

| Cron                | Frecuencia  | Flujo                                                                                                                                                                                                    |
| ------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `actualizarClima`   | cada 15 min | Lee zonas → Open-Meteo (una petición) → calcula `mm1h`, `mm24h` → guarda `LecturaClima` (`OPEN_METEO`) → actualiza `estado`. Luego baja Conagua y guarda una lectura de apoyo (`CONAGUA`) por municipio. |
| `reevaluarReportes` | cada 10 min | Pasa los reportes `PENDIENTE` a `CORROBORADO` / `NO_CORROBORADO`. Si corrobora, crea o renueva `ZonaRiesgo` (`INUNDACION`, `CLIMA`, +3 días).                                                            |
| `expirarRiesgos`    | cada hora   | `activa = false` donde `motivo = INUNDACION` y `venceEn < ahora`.                                                                                                                                        |
| `revisarCiclones`   | cada 3 h    | Si hay ciclón cerca, crea `ZonaRiesgo` (`INUNDACION`, `CICLON`, +3 días) y un `Reporte` con `fuente = CICLON`.                                                                                           |

**Regla de estado por lluvia (ajustar para Los Mochis):**

```
mm1h >= 20  o  mm24h >= 50   -> PRECAUCION
mm1h >= 40  o  mm24h >= 100  -> INUNDADO (probable)
```

Con histéresis: para bajar de estado hacen falta 2 lecturas seguidas por debajo.

**Regla de corroboración:**

- `PENDIENTE`: la zona no tiene lectura reciente o faltan datos.
- `CORROBORADO`: la foto dice `INUNDADO` o `PARCIAL` y la lluvia reciente supera el umbral.
- `NO_CORROBORADO`: la foto dice `INUNDADO` pero la lluvia es poca o nula.

---

## 7. API pública

### `GET /mapa/:municipioSlug`

```json
{
  "municipio": "ahome",
  "actualizadoEn": "2026-10-15T19:45:00Z",
  "zonas": [
    {
      "id": 1,
      "latCentro": 25.79,
      "lngCentro": -108.99,
      "ladoM": 9000,
      "estado": "PRECAUCION",
      "mm1h": 22.5,
      "mm24h": 41.0
    }
  ],
  "zonasRiesgo": [
    {
      "id": 7,
      "lat": 25.8,
      "lng": -108.99,
      "radioM": 500,
      "motivo": "ALTURA",
      "origen": "MANUAL",
      "venceEn": null
    }
  ]
}
```

Solo zonas de riesgo con `activa = true`. Leaflet: `L.rectangle(limites(z))` y `L.circle([lat, lng], {radius})`.

### `POST /reportes` (multipart: `foto`, `lat`, `lng`)

1. Throttler por IP (por ejemplo 1 reporte cada 5 min).
2. Leer EXIF → `fechaFoto`.
3. Buscar zona con `contiene(zona, lat, lng)`; si no cae en ninguna → rechazar.
4. Validar fecha: `ahora - (fechaFoto ?? ahora) <= 30 min`; si no → rechazar.
5. `GeminiService.clasificarFoto(buffer, mimeType)`.
6. Guardar `Reporte` (`PENDIENTE`, o evaluado si hay lectura reciente).
7. Responder `{ id, tipo, clasificacion, zonaId }`.

### Otros

- `GET /reportes?zonaId=&desde=`: reportes recientes (para puntos en el mapa).
- `GET /zonas/:id`: detalle con últimas lecturas.
- `GET /alertas/ciclon` (opcional).

### Admin (header `x-api-key`)

- `POST /admin/simular-lluvia` `{zonaId, mm1h, mm24h}`
- `POST /admin/cron/:nombre`
- `POST /admin/zonas/generar` `{municipioSlug, sw, ne}`
- `POST /admin/riesgo-altura/:zonaId` (corre el cálculo de la sección 5)
- `POST /admin/ciclon`

---

## 8. Riesgos y límites

1. **Resolución:** todo Los Mochis cae en pocas celdas de 9 km; las colonias de una misma celda comparten lluvia.
2. **Lluvia no es inundación:** el estado por lluvia es "probable"; el reporte confirma.
3. **Datos de modelo:** `mm1h` y `mm24h` vienen de un modelo de pronóstico, no de pluviómetros.
4. **Conagua:** el servicio es nacional y pesado, puede fallar; el ciclón puede requerir carga manual.
5. **Sin usuarios:** el spam es posible; throttler por IP y no subir una zona a `INUNDADO` por un solo reporte.
6. **Gemini:** revisa límites y términos del plan gratuito (las fotos de otras personas son datos sensibles). No guardes la foto.
7. **Licencia Open-Meteo:** gratis solo para uso no comercial, con atribución.

---

## 9. Plan de trabajo por fases (8 h)

### Fase 1 (0:00–1:00) Base

- [ ] Proyecto NestJS, Prisma, Postgres, `.env` (`DATABASE_URL`, `GEMINI_API_KEY`, `ADMIN_API_KEY`).
- [ ] Esquema Prisma de la sección 2 + migración.
- [ ] Seed: México → Sinaloa → Ahome (con `idEstadoSmn` e `idMunSmn`).

### Fase 2 (1:00–2:30) Zonas y Open-Meteo

- [ ] `OpenMeteoService.getLluviaZonas()` con prueba manual de índices.
- [ ] Utilidades de límites (`contiene`, `limites`).
- [ ] `POST /admin/zonas/generar` y verificación `latModelo/lngModelo`.

### Fase 3 (2:30–4:00) Cron de clima y mapa

- [ ] Cron `actualizarClima` + regla de estado + `LecturaClima`.
- [ ] `GET /mapa/:municipioSlug`.
- [ ] `POST /admin/simular-lluvia`.

### Fase 4 (4:00–5:00) Front

- [ ] Leaflet con rectángulos de zonas (colores por estado) y círculos de riesgo.

### Fase 5 (5:00–6:30) Reportes

- [ ] `GeminiService` con system instruction y esquema.
- [ ] EXIF con `exifr` y validaciones.
- [ ] `POST /reportes` + throttler.
- [ ] Cron `reevaluarReportes`.

### Fase 6 (6:30–7:30) Riesgos, Conagua, ciclones

- [ ] Cálculo de altura (sección 5) y `expirarRiesgos`.
- [ ] `ConaguaService` (method=3, descomprimir, filtrar por municipio).
- [ ] `revisarCiclones` + `POST /admin/ciclon`.

### Fase 7 (7:30–8:00) Demo

- [ ] Datos de prueba, simulación de lluvia, ensayo del pitch.

**Si falta tiempo, se recorta en este orden:** ciclones → Conagua → cálculo de altura (usar puntos manuales).
