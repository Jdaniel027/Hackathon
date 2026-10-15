import type { RiskZoneCollection } from "../types/riskZone";

/**
 * ⚠️ ZONAS FICTICIAS SOLO PARA DESARROLLO.
 * No representan zonas reales de inundación ni información oficial, validada
 * o calculada. Sirven únicamente para comprobar la visualización de polígonos.
 * Deben sustituirse por la respuesta GeoJSON del backend antes de cualquier demo.
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
        riskLevel: "high",
        description:
          "Sector con drenaje insuficiente (zona de demostración).",
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
        name: "Colonia del Norte",
        riskLevel: "medium",
        description:
          "Escurrimientos hacia calles principales (zona de demostración).",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-108.472, 25.5855],
            [-108.464, 25.5855],
            [-108.464, 25.5805],
            [-108.472, 25.5805],
            [-108.472, 25.5855],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "rz-003",
        name: "Sector Sur",
        riskLevel: "low",
        description:
          "Encharcamientos menores y temporales (zona de demostración).",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-108.47, 25.562],
            [-108.462, 25.562],
            [-108.462, 25.5575],
            [-108.47, 25.5575],
            [-108.47, 25.562],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "rz-004",
        name: "Zona Poniente",
        riskLevel: "high",
        description:
          "Cercana a canales; riesgo elevado en lluvias (zona de demostración).",
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
