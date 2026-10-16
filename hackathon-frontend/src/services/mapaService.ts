import type { MapaResponse } from "../features/risk-zones/types/mapaApi";
import { apiGet } from "./apiClient";

/**
 * `GET /api/v1/mapa/:municipioSlug` — zonas y riesgos activos de un municipio.
 *
 * Contrato: `hackaton-backend/docs/API_MANUAL.md` §3 y
 * `hackaton-backend/src/modules/zonas/zonas.types.ts`. El tipo de respuesta es
 * el espejo del backend (`features/risk-zones/types/mapaApi.ts`).
 */
export function fetchMapa(
  municipioSlug: string,
  signal?: AbortSignal,
): Promise<MapaResponse> {
  return apiGet<MapaResponse>(
    `/mapa/${encodeURIComponent(municipioSlug)}`,
    signal,
  );
}
