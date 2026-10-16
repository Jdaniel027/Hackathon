import type { MapaResponse, ZonaRiesgoMapa } from "../types/mapaApi";
import type {
  RiskZoneCollection,
  RiskZoneFeature,
  ZoneStatus,
} from "../types/riskZone";
import { createCirclePolygon } from "./circle";

const CIRCLE_STEPS = 64;

/**
 * Traduce el `motivo`/`origen` de una `ZonaRiesgo` del backend al estado visual
 * público (amarillo/rojo) del frontend, según D-007:
 *
 * - `origen === "CICLON"` → `at_risk` (riesgo por huracán, amarillo).
 * - `motivo === "INUNDACION"` → `flooded` (inundación, rojo). Incluye las
 *   creadas por el clima y por reportes corroborados.
 * - `motivo === "ALTURA"` → sin estado público por ahora: D-007 reserva el
 *   amarillo a huracán y el rojo a inundación, así que el riesgo por elevación
 *   queda fuera hasta que producto defina su color/rótulo. Devuelve `null`.
 */
export function riskStatusFromRiskZone(
  risk: ZonaRiesgoMapa,
): ZoneStatus | null {
  if (risk.origen === "CICLON") return "at_risk";
  if (risk.motivo === "INUNDACION") return "flooded";
  return null;
}

/** Nombre legible de la zona; el backend no expone uno. */
function riskZoneName(risk: ZonaRiesgoMapa): string {
  if (risk.origen === "CICLON") return "Riesgo por huracán";
  if (risk.motivo === "INUNDACION") return "Zona inundada";
  return "Zona de riesgo";
}

/**
 * Convierte una `ZonaRiesgoMapa` (origen + radio) en una feature dibujable:
 * el círculo se aproxima con un polígono y se conserva `origin`/`radiusM` para
 * pintar el punto de origen y mostrar el radio en el detalle.
 */
export function adaptRiskZone(risk: ZonaRiesgoMapa): RiskZoneFeature | null {
  const status = riskStatusFromRiskZone(risk);
  if (!status) return null;

  return {
    type: "Feature",
    geometry: createCirclePolygon(risk.lat, risk.lng, risk.radioM, CIRCLE_STEPS),
    properties: {
      id: `riesgo-${risk.id}`,
      name: riskZoneName(risk),
      status,
      origin: { lat: risk.lat, lng: risk.lng },
      radiusM: risk.radioM,
    },
  };
}

/**
 * Adapta la respuesta de `GET /api/v1/mapa/:municipioSlug` a la colección que
 * dibuja el mapa.
 *
 * Alcance actual: solo `zonasRiesgo` (las que traen **punto de origen +
 * radio/circunferencia**). Las `zonas` de la malla y el motivo `ALTURA` quedan
 * pendientes de decisión de producto y no se representan todavía.
 */
export function adaptMapaResponse(mapa: MapaResponse): RiskZoneCollection {
  // Defensivo: una respuesta sin `zonasRiesgo` no debe romper el render.
  const features = (mapa.zonasRiesgo ?? [])
    .map(adaptRiskZone)
    .filter((feature): feature is RiskZoneFeature => feature !== null);

  return { type: "FeatureCollection", features };
}
