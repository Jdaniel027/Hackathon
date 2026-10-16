import { describe, expect, it } from 'vitest';
import { contiene, limites, mitadesEnGrados } from './geo.util.js';

const zona = { latCentro: 23.2494, lngCentro: -106.4111, ladoM: 9000 };

describe('geometría de zonas', () => {
  it('convierte media celda a grados ajustando la longitud a la latitud', () => {
    const ecuador = mitadesEnGrados(0, 9000);
    const mazatlan = mitadesEnGrados(zona.latCentro, zona.ladoM);

    expect(mazatlan.dLat).toBeCloseTo(4500 / 111_320);
    expect(mazatlan.dLng).toBeGreaterThan(ecuador.dLng);
    expect(mazatlan.dLng).toBeCloseTo(
      4500 / (111_320 * Math.cos((zona.latCentro * Math.PI) / 180)),
    );
  });

  it('calcula las esquinas sudoeste y noreste desde el centro', () => {
    const { dLat, dLng } = mitadesEnGrados(zona.latCentro, zona.ladoM);
    expect(limites(zona)).toEqual([
      [zona.latCentro - dLat, zona.lngCentro - dLng],
      [zona.latCentro + dLat, zona.lngCentro + dLng],
    ]);
  });

  it('incluye los bordes y excluye los puntos fuera del cuadrado', () => {
    const [sw, ne] = limites(zona);
    expect(contiene(zona, zona.latCentro, zona.lngCentro)).toBe(true);
    expect(contiene(zona, sw[0], sw[1])).toBe(true);
    expect(contiene(zona, ne[0], ne[1])).toBe(true);
    expect(contiene(zona, ne[0] + 0.001, zona.lngCentro)).toBe(false);
    expect(contiene(zona, zona.latCentro, sw[1] - 0.001)).toBe(false);
  });
});
