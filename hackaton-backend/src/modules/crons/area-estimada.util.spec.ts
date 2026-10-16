import { describe, expect, it } from 'vitest';
import { contiene } from '../zonas/utils/geo.util.js';
import { celdasBajasConectadas, mallaReporte } from './area-estimada.util.js';

const zona = { latCentro: 25.5655, lngCentro: -108.4718, ladoM: 9000 };

describe('estimación de celdas bajas conectadas', () => {
  it('muestra como máximo 25 celdas dentro de la zona y usa la coordenada reportada', () => {
    const celdas = mallaReporte(zona, zona.latCentro, zona.lngCentro);
    expect(celdas).toHaveLength(25);
    expect(
      celdas.every(({ punto }) =>
        contiene(zona, punto.latCentro, punto.lngCentro),
      ),
    ).toBe(true);
    expect(
      celdas.find(({ fila, columna }) => fila === 0 && columna === 0)?.punto,
    ).toEqual({
      latCentro: zona.latCentro,
      lngCentro: zona.lngCentro,
    });
  });

  it('no sale de la zona cuando el reporte está cerca del borde', () => {
    const celdas = mallaReporte(zona, zona.latCentro + 0.038, zona.lngCentro);
    expect(celdas.length).toBeLessThan(25);
    expect(
      celdas.every(({ punto }) =>
        contiene(zona, punto.latCentro, punto.lngCentro),
      ),
    ).toBe(true);
  });

  it('no salta una barrera alta aunque haya una celda baja detrás', () => {
    const celdas = mallaReporte(zona, zona.latCentro, zona.lngCentro);
    const elevaciones = celdas.map(() => 20);
    for (const [indice, celda] of celdas.entries()) {
      if (celda.fila === 0 && celda.columna === 0) elevaciones[indice] = 10;
      if (celda.fila === 2 && celda.columna === 0) elevaciones[indice] = 9;
      if (celda.fila === 1 && celda.columna === 0) elevaciones[indice] = 14;
    }
    const puntos = celdasBajasConectadas(celdas, elevaciones);
    expect(puntos).toEqual([
      { latCentro: zona.latCentro, lngCentro: zona.lngCentro },
    ]);
  });

  it('incluye vecinos bajos conectados y rechaza respuestas incompletas', () => {
    const celdas = mallaReporte(zona, zona.latCentro, zona.lngCentro);
    const elevaciones = celdas.map(() => 20);
    for (const [indice, celda] of celdas.entries()) {
      if (celda.fila === 0 && celda.columna === 0) elevaciones[indice] = 10;
      if (celda.fila === 1 && celda.columna === 0) elevaciones[indice] = 11;
    }
    expect(celdasBajasConectadas(celdas, elevaciones)).toHaveLength(2);
    expect(() => celdasBajasConectadas(celdas, [10])).toThrow(/incompletas/);
  });
});
