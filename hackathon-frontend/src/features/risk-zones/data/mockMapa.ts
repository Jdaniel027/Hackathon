import type { MapaResponse } from "../types/mapaApi";

/**
 * ⚠️ RESPUESTA FICTICIA SOLO PARA DESARROLLO.
 *
 * Calca la forma de `GET /api/v1/mapa/:municipioSlug` del backend
 * (`hackaton-backend/docs/API_MANUAL.md` §3) para poder trabajar el mapa sin
 * backend levantado. No representa zonas reales ni estados verificados.
 *
 * - Una zona de riesgo por huracán (`origen: "CICLON"` → amarillo).
 * - Una inundación confirmada (`motivo: "INUNDACION"`, `origen: "CLIMA"` → rojo).
 * - Una zona de riesgo por elevación (`motivo: "ALTURA"`, aún sin color público).
 *
 * Debe sustituirse por la respuesta real del backend antes de cualquier demo.
 */
export const MOCK_MAPA: MapaResponse = {
  municipio: "mazatlan",
  actualizadoEn: "2026-10-16T12:00:00.000Z",
  zonas: [],
  zonasRiesgo: [
    {
      id: 1,
      lat: 25.572,
      lng: -108.4715,
      radioM: 600,
      motivo: "INUNDACION",
      origen: "CICLON",
      venceEn: "2026-10-19T12:00:00.000Z",
    },
    {
      id: 2,
      lat: 25.5735,
      lng: -108.484,
      radioM: 500,
      motivo: "INUNDACION",
      origen: "CLIMA",
      venceEn: "2026-10-19T12:00:00.000Z",
    },
    {
      id: 3,
      lat: 25.568,
      lng: -108.475,
      radioM: 500,
      motivo: "ALTURA",
      origen: "MANUAL",
      venceEn: null,
    },
  ],
};
