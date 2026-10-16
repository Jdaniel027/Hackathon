import { useCallback, useEffect, useState } from "react";

import { fetchMapa } from "../../../services/mapaService";
import { MOCK_RISK_ZONES } from "../data/mockRiskZones";
import { adaptMapaResponse } from "../lib/mapaAdapter";
import { applyZoneStatus } from "../lib/zoneTransitions";
import type { RiskZoneCollection, ZoneStatus } from "../types/riskZone";

/** De dónde salieron las zonas que se están dibujando. */
export type RiskZoneSource = "api" | "mock";

interface UseRiskZonesResult {
  zones: RiskZoneCollection;
  /** Hay una petición en curso. */
  loading: boolean;
  /** Mensaje de error de la última carga, o `null`. */
  error: string | null;
  /** `"api"` si respondió el backend; `"mock"` si se usaron datos de demostración. */
  source: RiskZoneSource;
  /** Reintenta la carga desde el backend. */
  refresh: () => void;
  /**
   * Alterna el estado de la primera zona (transición mock de F1-04) sin
   * recrear el mapa. Devuelve la colección actualizada para coordinar la
   * selección. No es flujo público; se retirará cuando el backend confirme.
   */
  transitionFirstZone: () => RiskZoneCollection;
}

/**
 * Carga las zonas de riesgo desde `GET /api/v1/mapa/:municipioSlug` (F1-20).
 *
 * Mientras la petición está en curso mantiene los datos de demostración para no
 * dejar el mapa vacío. Si el backend no responde, conserva el mock marcado como
 * `source: "mock"` para que la UI pueda avisar que son datos de demostración.
 */
export function useRiskZones(municipioSlug: string): UseRiskZonesResult {
  const [zones, setZones] = useState<RiskZoneCollection>(MOCK_RISK_ZONES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<RiskZoneSource>("mock");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetchMapa(municipioSlug, controller.signal)
      .then((mapa) => {
        if (controller.signal.aborted) return;
        setZones(adaptMapaResponse(mapa));
        setSource("api");
        setError(null);
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        // Sin backend accesible: se mantiene el mock (claramente identificado
        // en la UI) para que el mapa siga siendo demostrable.
        setZones(MOCK_RISK_ZONES);
        setSource("mock");
        setError(
          "No se pudo conectar con el backend; se muestran datos de demostración.",
        );
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [municipioSlug, reloadToken]);

  const refresh = useCallback(() => {
    // Fuera del efecto: aquí sí es seguro marcar la carga en curso.
    setLoading(true);
    setError(null);
    setReloadToken((token) => token + 1);
  }, []);

  const transitionFirstZone = useCallback(() => {
    const zone = zones.features[0];
    if (!zone) return zones;

    const nextStatus: ZoneStatus =
      zone.properties.status === "at_risk" ? "flooded" : "at_risk";
    const updated = applyZoneStatus(zones, zone.properties.id, nextStatus);
    setZones(updated);
    return updated;
  }, [zones]);

  return { zones, loading, error, source, refresh, transitionFirstZone };
}
