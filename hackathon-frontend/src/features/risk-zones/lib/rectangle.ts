import type { Polygon, Position } from "geojson";

import { M_PER_DEGREE } from "./circle";

/** Evita dividir por cero cerca de los polos. */
const MIN_COS_LAT = 1e-6;

/**
 * Construye el polígono GeoJSON del cuadro de la malla (`ZonaMapa`): un cuadrado
 * de `ladoM` metros centrado en `(latCentro, lngCentro)`.
 *
 * El backend define las zonas de la malla por centro + lado, no como polígono.
 * Se usa la misma aproximación plana que el backend
 * (`hackaton-backend/src/modules/zonas/utils/geo.util.ts`) para que el cuadro
 * dibujado coincida con su cálculo de contención (`contiene`).
 *
 * Coordenadas GeoJSON: `[longitud, latitud]`.
 */
export function createSquarePolygon(
  latCentro: number,
  lngCentro: number,
  ladoM: number,
): Polygon {
  const cosLat = Math.max(
    Math.abs(Math.cos((latCentro * Math.PI) / 180)),
    MIN_COS_LAT,
  );
  const mitadLat = ladoM / 2 / M_PER_DEGREE;
  const mitadLng = ladoM / 2 / (M_PER_DEGREE * cosLat);

  const oeste = lngCentro - mitadLng;
  const este = lngCentro + mitadLng;
  const sur = latCentro - mitadLat;
  const norte = latCentro + mitadLat;

  // Anillo cerrado (primer punto repetido al final), como exige GeoJSON.
  const ring: Position[] = [
    [oeste, sur],
    [este, sur],
    [este, norte],
    [oeste, norte],
    [oeste, sur],
  ];

  return { type: "Polygon", coordinates: [ring] };
}
