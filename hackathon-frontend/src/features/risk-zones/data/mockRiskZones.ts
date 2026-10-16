import type { RiskZoneCollection } from "../types/riskZone";

/**
 * ⚠️ ZONAS FICTICIAS SOLO PARA DESARROLLO.
 * No representan zonas reales de inundación ni información oficial, validada
 * o calculada. Sirven únicamente para comprobar la visualización de polígonos.
 * `status` simula el estado visual público que confirmará el backend:
 * `at_risk` (amarillo) es exclusivo de riesgo por huracán; `flooded` (rojo)
 * cubre inundación confirmada por huracán o por reportes ciudadanos. Deben
 * sustituirse por la respuesta GeoJSON del backend antes de cualquier demo.
 *
 * Orden de coordenadas GeoJSON: [longitud, latitud].
 */
export const MOCK_RISK_ZONES: RiskZoneCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "rz-001",
        name: "Centro histórico",
        status: "at_risk",
        riskLevel: "high",
        description:
          "Riesgo de inundación por huracán (zona de demostración).",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-108.475, 25.5745],
            [-108.468, 25.5745],
            [-108.468, 25.5695],
            [-108.475, 25.5695],
            [-108.475, 25.5745],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "rz-002",
        name: "Zona Poniente",
        status: "flooded",
        riskLevel: "high",
        description:
          "Inundación confirmada cerca del canal (zona de demostración).",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-108.488, 25.576],
            [-108.48, 25.576],
            [-108.48, 25.571],
            [-108.488, 25.571],
            [-108.488, 25.576],
          ],
        ],
      },
    },
  ],
};
