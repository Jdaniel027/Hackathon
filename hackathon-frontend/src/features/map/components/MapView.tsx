import { useCallback, useEffect, useState } from "react";

import LocateControl from "./LocateControl";
import MapSelectionPopup from "./MapSelectionPopup";
import MapStatusOverlay from "./MapStatusOverlay";
import { useMapInstance } from "../hooks/useMapInstance";
import { useUserLocation } from "../hooks/useUserLocation";
import { useUserLocationMarker } from "../hooks/useUserLocationMarker";
import RiskZonesLayer from "../../risk-zones/components/RiskZonesLayer";
import StatusTransitionDemo from "../../risk-zones/components/StatusTransitionDemo";
import { hasVisibleStatus } from "../../risk-zones/lib/zoneFilters";
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
  const { zones, transitionFirstZone } = useRiskZones();
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

  // Transición mock (F1-04): alterna el estado de la primera zona sin recrear
  // el mapa, y reajusta el popup si esa zona estaba seleccionada.
  const handleCycleFirstZone = useCallback(() => {
    const updated = transitionFirstZone();
    setSelection((current) => {
      if (!current) return current;
      const nextZone = updated.features.find(
        (feature) => feature.properties.id === current.zone.id,
      );
      // Si el nuevo estado queda oculto por su filtro, cerrar el popup.
      if (!nextZone || !statusVisibility[nextZone.properties.status]) {
        return null;
      }
      return { ...current, zone: nextZone.properties };
    });
  }, [transitionFirstZone, statusVisibility]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      <MapStatusOverlay ready={ready} error={error} />

      {/* Fuente de datos separada de la representación: los mocks se reemplazarán por el backend. */}
      <RiskZonesLayer
        map={map}
        data={zones}
        statusVisibility={statusVisibility}
        onToggleStatus={handleToggleStatus}
        onSelectZone={handleSelectZone}
      />

      {zones.features.length > 0 && hasVisibleStatus(statusVisibility) && (
        <StatusTransitionDemo
          zones={zones}
          onCycleFirstZone={handleCycleFirstZone}
        />
      )}

      <MapSelectionPopup
        map={map}
        selection={selection}
        onClose={handleCloseSelection}
      />

      <LocateControl status={locationStatus} onLocate={locate} />
    </div>
  );
}
