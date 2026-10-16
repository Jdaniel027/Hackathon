import { useCallback, useState } from "react";

import { MOCK_RISK_ZONES } from "../data/mockRiskZones";
import { applyZoneStatus } from "../lib/zoneTransitions";
import type { RiskZoneCollection, ZoneStatus } from "../types/riskZone";

interface UseRiskZonesResult {
  zones: RiskZoneCollection;
  /**
   * Alterna el estado de la primera zona (transición mock de F1-04) sin
   * recrear el mapa. Devuelve la colección actualizada para coordinar la
   * selección. No es flujo público; se retirará cuando el backend confirme.
   */
  transitionFirstZone: () => RiskZoneCollection;
}

/**
 * Mantiene la colección de zonas en estado local. Hoy parte del mock; cuando
 * exista backend, este hook será el punto de adaptación de los datos.
 */
export function useRiskZones(
  initial: RiskZoneCollection = MOCK_RISK_ZONES,
): UseRiskZonesResult {
  const [zones, setZones] = useState<RiskZoneCollection>(initial);

  const transitionFirstZone = useCallback(() => {
    const zone = zones.features[0];
    if (!zone) return zones;

    const nextStatus: ZoneStatus =
      zone.properties.status === "at_risk" ? "flooded" : "at_risk";
    const updated = applyZoneStatus(zones, zone.properties.id, nextStatus);
    setZones(updated);
    return updated;
  }, [zones]);

  return { zones, transitionFirstZone };
}
