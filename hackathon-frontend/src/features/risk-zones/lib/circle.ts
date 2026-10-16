import type { Polygon, Position } from "geojson";

/**
 * Metros por grado de latitud. Es el **mismo** valor que usa el backend
 * (`hackaton-backend/src/modules/zonas/utils/geo.util.ts`) para que el círculo
 * dibujado aquí coincida con su cálculo de contención (`contiene`).
 */
export const M_PER_DEGREE = 111_320;

const DEFAULT_STEPS = 64;
/** Evita dividir por cero cerca de los polos. */
const MIN_COS_LAT = 1e-6;

/**
 * Construye el polígono GeoJSON que aproxima una circunferencia de radio
 * `radiusM` metros centrada en `(lat, lng)`.
 *
 * El backend representa las zonas de riesgo como un punto de origen más un
 * radio (`ZonaRiesgoMapa`), no como un polígono. MapLibre no tiene un radio en
 * metros nativo, así que se aproxima el círculo con un anillo de `steps`
 * vértices usando la misma aproximación plana (válida en áreas pequeñas) que el
 * backend. El anillo se cierra repitiendo el primer punto, como exige GeoJSON.
 *
 * Coordenadas GeoJSON: `[longitud, latitud]`.
 */
export function createCirclePolygon(
  lat: number,
  lng: number,
  radiusM: number,
  steps: number = DEFAULT_STEPS,
): Polygon {
  const pasos = Math.max(8, Math.floor(steps));
  const cosLat = Math.max(
    Math.abs(Math.cos((lat * Math.PI) / 180)),
    MIN_COS_LAT,
  );

  // Metros → grados en cada eje (misma fórmula que `mitadesEnGrados` del backend).
  const dLatPorMetro = 1 / M_PER_DEGREE;
  const dLngPorMetro = 1 / (M_PER_DEGREE * cosLat);

  const ring: Position[] = [];
  for (let i = 0; i <= pasos; i += 1) {
    const angle = (i / pasos) * 2 * Math.PI;
    ring.push([
      lng + radiusM * Math.cos(angle) * dLngPorMetro,
      lat + radiusM * Math.sin(angle) * dLatPorMetro,
    ]);
  }

  return { type: "Polygon", coordinates: [ring] };
}
