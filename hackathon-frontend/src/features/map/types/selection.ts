import type { RiskZoneProperties } from "../../risk-zones/types/riskZone";

/**
 * Selección activa del mapa. Es la única fuente de verdad de "qué zona está
 * seleccionada" y está pensada para que la presentación (popup ahora; panel
 * lateral o bottom sheet más adelante) consuma estos datos sin volver a
 * detectar el elemento.
 *
 * Solo existen zonas seleccionables: los reportes ciudadanos no se muestran
 * como entidades independientes en el mapa.
 */
export type MapSelection = {
  kind: "risk-zone";
  lngLat: [number, number];
  zone: RiskZoneProperties;
};
