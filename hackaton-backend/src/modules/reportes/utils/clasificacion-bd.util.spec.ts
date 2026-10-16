import { describe, expect, it } from 'vitest';
import { ClasificacionIA, EstadoZona } from '../../../generated/prisma/enums.js';
import type { ClasificacionFoto } from '../../gemini/gemini.service.js';
import { clasificacionBdAFoto, clasificacionFotoABd } from './clasificacion-bd.util.js';

describe('clasificacion-bd.util (adaptador temporal de ClasificacionIA)', () => {
  const casos: Array<[ClasificacionFoto, ClasificacionIA]> = [
    [EstadoZona.INUNDADO, ClasificacionIA.INUNDADO],
    [EstadoZona.PRECAUCION, ClasificacionIA.PARCIAL],
    [EstadoZona.NORMAL, ClasificacionIA.NO_INUNDADO],
  ];

  it.each(casos)('foto %s → BD %s', (foto, bd) => {
    expect(clasificacionFotoABd(foto)).toBe(bd);
  });

  it.each(casos)('BD %s → foto %s', (foto, bd) => {
    expect(clasificacionBdAFoto(bd)).toBe(foto);
  });

  it('es simétrico: la ida y vuelta devuelve el valor original', () => {
    for (const [foto, bd] of casos) {
      expect(clasificacionBdAFoto(clasificacionFotoABd(foto))).toBe(foto);
      expect(clasificacionFotoABd(clasificacionBdAFoto(bd))).toBe(bd);
    }
  });

  it('cubre exactamente los tres estados sin SIN_DATOS', () => {
    // El clasificador de foto decide entre INUNDADO/PRECAUCION/NORMAL.
    expect(Object.keys(casos)).toHaveLength(3);
    expect(casos.map(([foto]) => foto).sort()).toEqual(
      [EstadoZona.INUNDADO, EstadoZona.NORMAL, EstadoZona.PRECAUCION].sort(),
    );
  });
});
