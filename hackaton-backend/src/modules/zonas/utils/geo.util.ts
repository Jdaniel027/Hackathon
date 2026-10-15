// Utilidades de límites de una zona (cuadro por centro y lado).
// Fuente: docs/IDEA.md §3. Aproximación válida para áreas pequeñas (error < 1%).

export const M_POR_GRADO = 111_320;
const TOLERANCIA_GRADOS = 1e-12;

export interface ZonaGeometria {
  latCentro: number;
  lngCentro: number;
  ladoM: number;
}

export interface MitadesGrados {
  dLat: number;
  dLng: number;
}

export type Coordenada = [number, number];

export function mitadesEnGrados(lat: number, ladoM: number): MitadesGrados {
  const mitad = ladoM / 2;
  return {
    dLat: mitad / M_POR_GRADO,
    dLng: mitad / (M_POR_GRADO * Math.cos((lat * Math.PI) / 180)),
  };
}

export function contiene(
  zona: ZonaGeometria,
  lat: number,
  lng: number,
): boolean {
  const { dLat, dLng } = mitadesEnGrados(zona.latCentro, zona.ladoM);
  return (
    Math.abs(lat - zona.latCentro) <= dLat + TOLERANCIA_GRADOS &&
    Math.abs(lng - zona.lngCentro) <= dLng + TOLERANCIA_GRADOS
  );
}

export function limites(zona: ZonaGeometria): [Coordenada, Coordenada] {
  const { dLat, dLng } = mitadesEnGrados(zona.latCentro, zona.ladoM);
  return [
    [zona.latCentro - dLat, zona.lngCentro - dLng],
    [zona.latCentro + dLat, zona.lngCentro + dLng],
  ];
}
