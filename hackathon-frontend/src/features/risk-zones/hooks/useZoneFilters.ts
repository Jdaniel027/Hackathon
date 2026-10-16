import { useCallback, useState } from "react";

import type { ZoneStatus } from "../types/riskZone";
import {
  DEFAULT_STATUS_VISIBILITY,
  toggleStatusVisibility,
} from "../lib/zoneFilters";
import type { StatusVisibility } from "../lib/zoneFilters";

interface UseZoneFiltersResult {
  statusVisibility: StatusVisibility;
  /** Alterna un filtro y devuelve la visibilidad resultante. */
  toggleStatus: (status: ZoneStatus) => StatusVisibility;
}

/**
 * Estado de los dos filtros independientes del mapa (F1-06 / F1-07 / F1-08).
 * Devuelve la visibilidad resultante para que quien lo consuma pueda reaccionar
 * al cambio (p. ej. limpiar una selección que quedó oculta).
 */
export function useZoneFilters(
  initial: StatusVisibility = DEFAULT_STATUS_VISIBILITY,
): UseZoneFiltersResult {
  const [statusVisibility, setStatusVisibility] =
    useState<StatusVisibility>(initial);

  const toggleStatus = useCallback(
    (status: ZoneStatus) => {
      const next = toggleStatusVisibility(statusVisibility, status);
      setStatusVisibility(next);
      return next;
    },
    [statusVisibility],
  );

  return { statusVisibility, toggleStatus };
}
