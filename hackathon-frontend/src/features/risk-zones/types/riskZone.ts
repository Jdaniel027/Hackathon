import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

/**
 * Estado visual público de una zona. Es excluyente: una zona se dibuja
 * amarilla (`at_risk`) o roja (`flooded`), nunca ambas a la vez ni duplicada.
 * Lo determina el backend; el frontend solo lo presenta.
 */
export type ZoneStatus = "at_risk" | "flooded";

/**
 * Clasificación histórica del riesgo. Es un dato **distinto** del estado visual
 * y puede conservarse como contexto, incluso cuando la zona esté inundada.
 * `unknown` no equivale a ausencia de inundación.
 */
export type RiskLevel = "low" | "medium" | "high" | "unknown";

/** Punto de origen de una zona de riesgo circular (contrato backend). */
export interface RiskZoneOrigin {
  lat: number;
  lng: number;
}

/** Propiedades asociadas a cada zona. */
export interface RiskZoneProperties {
  id: string;
  name: string;
  /** Estado visual público confirmado. */
  status: ZoneStatus;
  /** Nivel de riesgo histórico (opcional, contexto). */
  riskLevel?: RiskLevel;
  description?: string;
  /**
   * Centro de la zona de riesgo circular. Proviene de `ZonaRiesgoMapa.lat/lng`
   * (el punto de origen del reporte/evidencia). Se usa para pintar el punto de
   * origen; la geometría dibujada es la circunferencia aproximada.
   */
  origin?: RiskZoneOrigin;
  /** Radio en metros de la zona circular (`ZonaRiesgoMapa.radioM`). */
  radiusM?: number;
  /**
   * Lluvia registrada por el backend en el cuadro de malla (`ZonaMapa.mm1h` /
   * `mm24h`). Solo la traen las features de la malla, no las de riesgo.
   */
  rainMm1h?: number;
  rainMm24h?: number;
}

export type RiskZoneGeometry = Polygon | MultiPolygon;

export type RiskZoneFeature = Feature<RiskZoneGeometry, RiskZoneProperties>;

/**
 * Colección GeoJSON de zonas. Cada zona aparece una sola vez, con su estado
 * visual actual (`at_risk` o `flooded`).
 * Este tipo es el contrato que podrá devolver el backend en una etapa posterior.
 */
export type RiskZoneCollection = FeatureCollection<
  RiskZoneGeometry,
  RiskZoneProperties
>;
