import { contiene, M_POR_GRADO } from '../zonas/utils/geo.util.js';
import type { ZonaGeometria } from '../zonas/utils/geo.util.js';
import type { PuntoZona } from '../open-meteo/open-meteo.service.js';

const PASO_M = 1000;
const ALCANCE_PASOS = 2;
// DEM GLO-90 es aproximado: el umbral no equivale a un nivel de agua medido.
const TOLERANCIA_ELEVACION_M = 1.5;

interface Celda {
  fila: number;
  columna: number;
  punto: PuntoZona;
}

export function mallaReporte(
  zona: ZonaGeometria,
  lat: number,
  lng: number,
): Celda[] {
  const celdas: Celda[] = [];
  for (let fila = -ALCANCE_PASOS; fila <= ALCANCE_PASOS; fila += 1) {
    for (let columna = -ALCANCE_PASOS; columna <= ALCANCE_PASOS; columna += 1) {
      const punto = {
        latCentro: lat + (fila * PASO_M) / M_POR_GRADO,
        lngCentro:
          lng +
          (columna * PASO_M) / (M_POR_GRADO * Math.cos((lat * Math.PI) / 180)),
      };
      if (contiene(zona, punto.latCentro, punto.lngCentro)) {
        celdas.push({ fila, columna, punto });
      }
    }
  }
  return celdas;
}

// Solo celdas bajas conectadas por lados al punto reportado: no salta barreras altas.
export function celdasBajasConectadas(
  celdas: Celda[],
  elevaciones: number[],
): PuntoZona[] {
  if (
    celdas.length !== elevaciones.length ||
    !elevaciones.every(Number.isFinite)
  ) {
    throw new Error('Elevaciones incompletas para estimar el área.');
  }
  const indice = new Map(
    celdas.map((celda, posicion) => [
      `${celda.fila}:${celda.columna}`,
      posicion,
    ]),
  );
  const origen = indice.get('0:0');
  if (origen === undefined) return [];
  const elevacionOrigen = elevaciones[origen];
  const pendientes = [origen];
  const visitados = new Set<number>();
  const resultado: PuntoZona[] = [];

  while (pendientes.length) {
    const posicion = pendientes.shift()!;
    if (visitados.has(posicion)) continue;
    visitados.add(posicion);
    if (elevaciones[posicion] > elevacionOrigen + TOLERANCIA_ELEVACION_M)
      continue;
    const celda = celdas[posicion];
    resultado.push(celda.punto);
    for (const [df, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const vecino = indice.get(`${celda.fila + df}:${celda.columna + dc}`);
      if (vecino !== undefined && !visitados.has(vecino))
        pendientes.push(vecino);
    }
  }
  return resultado;
}
