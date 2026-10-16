import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

/** Nivel de riesgo de una zona de inundación. */
export type RiskLevel = "low" | "medium" | "high";

/** Propiedades asociadas a cada zona de riesgo. */
export interface RiskZoneProperties {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  description?: string;
}

export type RiskZoneGeometry = Polygon | MultiPolygon;

export type RiskZoneFeature = Feature<RiskZoneGeometry, RiskZoneProperties>;

/**
 * Colección GeoJSON de zonas de riesgo.
 * Este tipo es el contrato que podrá devolver el backend en una etapa posterior.
 */
export type RiskZoneCollection = FeatureCollection<
  RiskZoneGeometry,
  RiskZoneProperties
>;
