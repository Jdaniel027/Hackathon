import type { RiskZoneCollection } from "../types/riskZone";
import { adaptMapaResponse } from "../lib/mapaAdapter";
import { MOCK_MAPA } from "./mockMapa";

/**
 * ⚠️ ZONAS FICTICIAS SOLO PARA DESARROLLO.
 *
 * Se derivan de `MOCK_MAPA` con el mismo adaptador que usará la respuesta real
 * del backend (`adaptMapaResponse`), de modo que el mapa ya trabaje con la
 * forma del contrato: cada zona de riesgo es un **punto de origen + una
 * circunferencia** (`radioM`), no un polígono escrito a mano.
 *
 * No representan zonas reales de inundación ni información oficial, validada
 * o calculada. Deben sustituirse por la respuesta del backend antes de
 * cualquier demo.
 */
export const MOCK_RISK_ZONES: RiskZoneCollection =
  adaptMapaResponse(MOCK_MAPA);
