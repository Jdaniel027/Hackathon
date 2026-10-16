import type { MapaResponse, ZonaMapa, ZonaRiesgoMapa } from "../types/mapaApi";
import type {
  RiskZoneCollection,
  RiskZoneFeature,
  ZoneStatus,
} from "../types/riskZone";
import { createCirclePolygon } from "./circle";
import { createSquarePolygon } from "./rectangle";

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

/**
 * Traduce el `estado` de un cuadro de la malla (`ZonaMapa`) al estado visual:
 *
 * - `INUNDADO` → `flooded` (rojo): lluvia por encima del umbral de inundación.
 * - `PRECAUCION` → sin estado público por ahora: D-007 reserva el amarillo a
 *   huracán, así que la precaución por lluvia no se pinta hasta que producto
 *   decida su color/rótulo (ver propuesta D-009). Devuelve `null`.
 * - `NORMAL` / `SIN_DATOS` → sin estado público (`null`).
 */
export function zonaStatusFromZona(zona: ZonaMapa): ZoneStatus | null {
  return zona.estado === "INUNDADO" ? "flooded" : null;
}

/** Nombre legible de la zona de riesgo; el backend no expone uno. */
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
 * Convierte un cuadro de la malla (`ZonaMapa`) en una feature dibujable: un
 * cuadrado de `ladoM` metros centrado en `(latCentro, lngCentro)` cuando su
 * `estado` tiene un color público (`INUNDADO`). Conserva la lluvia medida.
 */
export function adaptZona(zona: ZonaMapa): RiskZoneFeature | null {
  const status = zonaStatusFromZona(zona);
  if (!status) return null;

  return {
    type: "Feature",
    geometry: createSquarePolygon(zona.latCentro, zona.lngCentro, zona.ladoM),
    properties: {
      id: `zona-${zona.id}`,
      name: "Cuadro de malla inundado",
      status,
      rainMm1h: zona.mm1h,
      rainMm24h: zona.mm24h,
    },
  };
}

/**
 * Adapta la respuesta de `GET /api/v1/mapa/:municipioSlug` a la colección que
 * dibuja el mapa:
 *
 * - `zonasRiesgo[]` (círculos: punto de origen + radio) → `riesgo-<id>`.
 * - `zonas[]` (cuadros de la malla) → `zona-<id>`, solo si su estado tiene
 *   color público (`INUNDADO`). `PRECAUCION`/`NORMAL`/`SIN_DATOS` se omiten
 *   hasta que se decida su color (ver D-009). Los ids llevan prefijo distinto
 *   para que malla y riesgos nunca colisionen.
 */
export function adaptMapaResponse(mapa: MapaResponse): RiskZoneCollection {
  // Defensivo: una respuesta sin `zonas`/`zonasRiesgo` no debe romper el render.
  const zonas = (mapa.zonas ?? [])
    .map(adaptZona)
    .filter((feature): feature is RiskZoneFeature => feature !== null);
  const riesgos = (mapa.zonasRiesgo ?? [])
    .map(adaptRiskZone)
    .filter((feature): feature is RiskZoneFeature => feature !== null);

  return { type: "FeatureCollection", features: [...zonas, ...riesgos] };
}
