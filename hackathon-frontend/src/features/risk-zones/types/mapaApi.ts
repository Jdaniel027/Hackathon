/**
 * Espejo del contrato público del backend (AquaReport).
 *
 * Fuente: `hackaton-backend/src/modules/zonas/zonas.types.ts` y
 * `hackaton-backend/docs/API_MANUAL.md` §2 y §3 (`GET /api/v1/mapa/:municipioSlug`).
 *
 * No se inventan campos: los nombres y tipos provienen del backend tal cual.
 */

/** Estado de la zona (por lluvia). */
export type EstadoZonaApi = "SIN_DATOS" | "NORMAL" | "PRECAUCION" | "INUNDADO";

/** Por qué es riesgo una `ZonaRiesgo`. */
export type MotivoRiesgoApi = "ALTURA" | "INUNDACION";

/** Quién creó la `ZonaRiesgo`. */
export type OrigenRiesgoApi = "MANUAL" | "CICLON" | "CLIMA";

/** Cuadro de la malla (centro + lado en metros) con su estado por lluvia. */
export interface ZonaMapa {
  id: number;
  latCentro: number;
  lngCentro: number;
  ladoM: number;
  estado: EstadoZonaApi;
  mm1h: number;
  mm24h: number;
}

/**
 * Zona de riesgo **circular**: punto de origen (`lat`/`lng`) + radio (`radioM`).
 * Así las dibuja el backend (`L.circle([lat, lng], { radius: radioM })`).
 */
export interface ZonaRiesgoMapa {
  id: number;
  lat: number;
  lng: number;
  radioM: number;
  motivo: MotivoRiesgoApi;
  origen: OrigenRiesgoApi;
  /** ISO 8601 o `null` si es permanente (motivo ALTURA). */
  venceEn: string | null;
}

/** Respuesta de `GET /api/v1/mapa/:municipioSlug`. */
export interface MapaResponse {
  municipio: string;
  actualizadoEn: string;
  zonas: ZonaMapa[];
  /** Solo riesgos con `activa = true`. */
  zonasRiesgo: ZonaRiesgoMapa[];
}
