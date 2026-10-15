import type { EstadoZonaApi } from '../zonas.types.js';

export interface UmbralesLluvia {
  precaucionMm1h: number;
  precaucionMm24h: number;
  inundadoMm1h: number;
  inundadoMm24h: number;
}

// Valores por defecto (docs/IDEA.md §6). Los Mochis/Ahome eran el caso original;
// el alcance acordado es multi-municipio con demo en Mazatlán.
const POR_DEFECTO: UmbralesLluvia = {
  precaucionMm1h: 20,
  precaucionMm24h: 50,
  inundadoMm1h: 40,
  inundadoMm24h: 100,
};

// TODO(DEVELOPER_H): mover a la base de datos (columna por municipio) para no
// dejar los umbrales en código. Por ahora se sobreescriben por slug aquí.
const POR_MUNICIPIO: Record<string, Partial<UmbralesLluvia>> = {
  // mazatlan: { precaucionMm1h: 18, ... },
};

export function umbralesPara(municipioSlug: string): UmbralesLluvia {
  return { ...POR_DEFECTO, ...(POR_MUNICIPIO[municipioSlug] ?? {}) };
}

// Regla de estado por lluvia. TODO: histéresis (2 lecturas seguidas para bajar).
export function calcularEstado(
  mm1h: number,
  mm24h: number,
  umbrales: UmbralesLluvia,
): EstadoZonaApi {
  if (mm1h >= umbrales.inundadoMm1h || mm24h >= umbrales.inundadoMm24h) {
    return 'INUNDADO';
  }
  if (mm1h >= umbrales.precaucionMm1h || mm24h >= umbrales.precaucionMm24h) {
    return 'PRECAUCION';
  }
  return 'NORMAL';
}
