import { useCallback, useEffect, useState } from "react";

import LocateControl from "./LocateControl";
import MapSelectionPopup from "./MapSelectionPopup";
import MapStatusOverlay from "./MapStatusOverlay";
import { useMapInstance } from "../hooks/useMapInstance";
import { useUserLocation } from "../hooks/useUserLocation";
import { useUserLocationMarker } from "../hooks/useUserLocationMarker";
import { MAP_CONFIG } from "../config/map.config";
import RiskZonesLayer from "../../risk-zones/components/RiskZonesLayer";
import { useRiskZones } from "../../risk-zones/hooks/useRiskZones";
import { useZoneFilters } from "../../risk-zones/hooks/useZoneFilters";
import type { MapSelection } from "../types/selection";
import type {
  RiskZoneProperties,
  ZoneStatus,
} from "../../risk-zones/types/riskZone";

/**
 * Composición del mapa (F1). Orquesta piezas pequeñas: el ciclo de vida de
 * MapLibre (`useMapInstance`), los datos de zonas (`useRiskZones`), los dos
 * filtros de estado (`useZoneFilters`) y la selección activa. Emite la
 * selección hacia arriba; **no controla el Bottom Sheet**.
 */
export default function MapView() {
  const { containerRef, map, ready, error } = useMapInstance();
  const { zones, loading, error: zonesError } = useRiskZones(
    MAP_CONFIG.municipioSlug,
  );
  const { statusVisibility, toggleStatus } = useZoneFilters();
  const { status: locationStatus, coordinates, locate } = useUserLocation();

  // Única fuente de verdad de la selección activa del mapa.
  const [selection, setSelection] = useState<MapSelection | null>(null);

  // Al obtener la posición, centrar el mapa (sin recrearlo).
  useEffect(() => {
    if (!map || !coordinates) return;
    map.flyTo({ center: coordinates, zoom: Math.max(map.getZoom(), 15) });
  }, [map, coordinates]);

  // Punto azul en la posición del usuario mientras esté disponible.
  useUserLocationMarker(map, coordinates);

  const handleSelectZone = useCallback(
    (zone: RiskZoneProperties, lngLat: [number, number]) => {
      setSelection({ kind: "risk-zone", lngLat, zone });
    },
    [],
  );

  const handleCloseSelection = useCallback(() => {
    setSelection(null);
  }, []);

  // Alterna un filtro; si oculta el estado de la zona seleccionada, limpia la
  // selección (su popup dejaría de tener sentido). Regla completa: F1-13.
  const handleToggleStatus = useCallback(
    (status: ZoneStatus) => {
      const next = toggleStatus(status);
      setSelection((current) =>
        current && !next[current.zone.status] ? null : current,
      );
    },
    [toggleStatus],
  );

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      <MapStatusOverlay ready={ready} error={error} />

      {/* Datos reales del backend (`GET /api/v1/mapa/:municipioSlug`); sin
          respaldo simulado. */}
      <RiskZonesLayer
        map={map}
        data={zones}
        loading={loading}
        error={zonesError}
        statusVisibility={statusVisibility}
        onToggleStatus={handleToggleStatus}
        onSelectZone={handleSelectZone}
      />

      <MapSelectionPopup
        map={map}
        selection={selection}
        onClose={handleCloseSelection}
      />

      <LocateControl status={locationStatus} onLocate={locate} />
    </div>
  );
}
