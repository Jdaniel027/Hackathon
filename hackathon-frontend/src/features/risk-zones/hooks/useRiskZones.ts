import { useCallback, useEffect, useState } from "react";

import { fetchMapa } from "../../../services/mapaService";
import { adaptMapaResponse } from "../lib/mapaAdapter";
import type { RiskZoneCollection } from "../types/riskZone";

/** Colección vacía: estado inicial antes de que responda la API. */
const EMPTY_ZONES: RiskZoneCollection = {
  type: "FeatureCollection",
  features: [],
};

interface UseRiskZonesResult {
  /** Zonas devueltas por el backend (vacío mientras no haya respuesta). */
  zones: RiskZoneCollection;
  /** Hay una petición en curso. */
  loading: boolean;
  /** Mensaje de error de la última carga, o `null`. */
  error: string | null;
  /** Reintenta la carga desde el backend. */
  refresh: () => void;
}

/**
 * Carga las zonas de riesgo desde `GET /api/v1/mapa/:municipioSlug` (F1-20).
 *
 * Trabaja **solo con datos reales**: no hay respaldo simulado, para no pintar
 * zonas inventadas en el mapa. Mientras la petición está en curso, o si el
 * backend no responde, la colección queda vacía y la capa avisa del estado.
 */
export function useRiskZones(municipioSlug: string): UseRiskZonesResult {
  const [zones, setZones] = useState<RiskZoneCollection>(EMPTY_ZONES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetchMapa(municipioSlug, controller.signal)
      .then((mapa) => {
        if (controller.signal.aborted) return;
        setZones(adaptMapaResponse(mapa));
        setError(null);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setZones(EMPTY_ZONES);
        const detalle = cause instanceof Error ? cause.message : "";
        setError(
          detalle
            ? `No se pudieron cargar las zonas del backend (${detalle}).`
            : "No se pudieron cargar las zonas del backend.",
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

  return { zones, loading, error, refresh };
}
