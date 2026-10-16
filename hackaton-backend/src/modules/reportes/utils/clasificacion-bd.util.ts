import { ClasificacionIA, EstadoZona } from '../../../generated/prisma/enums.js';
import type { ClasificacionFoto } from '../../gemini/gemini.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTADOR TEMPORAL (anti-corruption layer)
//
// El clasificador de foto ya devuelve los valores de `EstadoZona` sin SIN_DATOS
// (INUNDADO / PRECAUCION / NORMAL), pero la columna `Reporte.clasificacion` en
// Prisma todavía usa el enum `ClasificacionIA` (INUNDADO / PARCIAL / NO_INUNDADO).
//
// Mientras DEVELOPER_H migra `ClasificacionIA` a los valores de EstadoZona, aquí
// se traduce en la frontera con la base de datos. Cuando la migración ocurra,
// estas funciones pasan a ser identidad y deben eliminarse.
// Propuesta: `docs/PROPUESTA_ENUM_CLASIFICACION.md`.
// ─────────────────────────────────────────────────────────────────────────────

const FOTO_A_BD: Record<ClasificacionFoto, ClasificacionIA> = {
  [EstadoZona.INUNDADO]: ClasificacionIA.INUNDADO,
  [EstadoZona.PRECAUCION]: ClasificacionIA.PARCIAL,
  [EstadoZona.NORMAL]: ClasificacionIA.NO_INUNDADO,
};

const BD_A_FOTO: Record<ClasificacionIA, ClasificacionFoto> = {
  [ClasificacionIA.INUNDADO]: EstadoZona.INUNDADO,
  [ClasificacionIA.PARCIAL]: EstadoZona.PRECAUCION,
  [ClasificacionIA.NO_INUNDADO]: EstadoZona.NORMAL,
};

export function clasificacionFotoABd(
  clasificacion: ClasificacionFoto,
): ClasificacionIA {
  return FOTO_A_BD[clasificacion];
}

export function clasificacionBdAFoto(
  clasificacion: ClasificacionIA,
): ClasificacionFoto {
  return BD_A_FOTO[clasificacion];
}
