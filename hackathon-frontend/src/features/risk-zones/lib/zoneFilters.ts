import type { ZoneStatus } from "../types/riskZone";
import { ZONE_STATUSES } from "./riskZoneStyles";

/**
 * Visibilidad de cada filtro de estado. Los dos filtros son **independientes**:
 * apagar uno no afecta al otro (F1-07 / F1-08).
 */
export type StatusVisibility = Record<ZoneStatus, boolean>;

/** Ambos filtros activos al iniciar el mapa. */
export const DEFAULT_STATUS_VISIBILITY: StatusVisibility = {
  at_risk: true,
  flooded: true,
};

/** Alterna un único filtro sin alterar el resto. */
export function toggleStatusVisibility(
  current: StatusVisibility,
  status: ZoneStatus,
): StatusVisibility {
  return { ...current, [status]: !current[status] };
}

/** Indica si queda al menos un filtro activo (es decir, si hay zonas visibles). */
export function hasVisibleStatus(visibility: StatusVisibility): boolean {
  return ZONE_STATUSES.some((status) => visibility[status]);
}
