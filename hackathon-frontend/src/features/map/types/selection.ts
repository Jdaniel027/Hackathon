import type { FloodReport } from "./report";
import type { RiskZoneProperties } from "../../risk-zones/types/riskZone";

/**
 * Selección activa del mapa. Es la única fuente de verdad de "qué elemento
 * está seleccionado" y está pensada para que la presentación (popup ahora;
 * panel lateral o bottom sheet más adelante) consuma estos datos sin volver a
 * detectar el elemento.
 */
export type MapSelection =
  | { kind: "report"; lngLat: [number, number]; report: FloodReport }
  | { kind: "risk-zone"; lngLat: [number, number]; zone: RiskZoneProperties };
