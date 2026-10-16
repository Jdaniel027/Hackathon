import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GeolocateControl,
  Map,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import type { GeolocateErrorEvent } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";

import { MAP_CONFIG } from "../config/map.config";
import { MOCK_FLOOD_REPORTS } from "../data/mockReports";
import { MOCK_RISK_ZONES } from "../../risk-zones/data/mockRiskZones";
import ReportMarkers from "./ReportMarkers";
import ReportFiltersPanel from "./ReportFiltersPanel";
import MapSelectionPopup from "./MapSelectionPopup";
import RiskZonesLayer from "../../risk-zones/components/RiskZonesLayer";
import { EMPTY_REPORT_FILTERS, filterReports } from "../lib/filterReports";
import type { ReportFilters } from "../lib/filterReports";
import type { MapSelection } from "../types/selection";
import type { FloodReport } from "../types/report";
import type { RiskZoneProperties } from "../../risk-zones/types/riskZone";

// Configurar el Worker antes de crear el mapa
setWorkerUrl(workerUrl);

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Única fuente de verdad de la selección activa del mapa.
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [zonesVisible, setZonesVisible] = useState(true);
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_REPORT_FILTERS);

  // Datos originales separados de los filtrados (sin mutar los mocks).
  const filteredReports = useMemo(
    () => filterReports(MOCK_FLOOD_REPORTS, filters),
    [filters],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: Map | null = null;
    let initError: string | null = null;
    try {
      map = new Map({
        container: containerRef.current,
        style: MAP_CONFIG.style,
        center: MAP_CONFIG.center,
        zoom: MAP_CONFIG.zoom,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom,
      });
    } catch (error) {
      console.error("❌ No se pudo inicializar el mapa:", error);
      initError =
        error instanceof Error
          ? error.message
          : "No se pudo inicializar el mapa.";
    }

    // setState en el bloque dominante del efecto (no dentro del catch).
    setMapError(initError);
    if (!map) return;

    mapRef.current = map;
    setMapInstance(map);

    // Zoom (+/-) y brújula para restablecer la orientación al norte.
    const navigationControl = new NavigationControl({
      showZoom: true,
      showCompass: true,
      visualizePitch: false,
    });
    map.addControl(navigationControl, "top-right");

    // Ubicación del usuario: el permiso solo se solicita al pulsar el control.
    const geolocateControl = new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: true,
    });
    map.addControl(geolocateControl, "top-right");

    map.on("load", () => {
      setMapReady(true);
      console.log("✅ Mapa cargado correctamente");
    });

    map.on("error", (event) => {
      console.error("❌ Error de MapLibre:", event.error);
    });

    // La geolocalización no debe bloquear el mapa si falla o se rechaza el permiso.
    const handleGeolocateError = (event: GeolocateErrorEvent) => {
      console.warn("⚠️ No se pudo obtener la ubicación:", event.message);
    };
    geolocateControl.on("error", handleGeolocateError);

    return () => {
      geolocateControl.off("error", handleGeolocateError);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleSelectReport = useCallback(
    (report: FloodReport, lngLat: [number, number]) => {
      setSelection({ kind: "report", lngLat, report });
    },
    [],
  );

  const handleSelectZone = useCallback(
    (zone: RiskZoneProperties, lngLat: [number, number]) => {
      setSelection({ kind: "risk-zone", lngLat, zone });
    },
    [],
  );

  const handleCloseSelection = useCallback(() => {
    setSelection(null);
  }, []);

  // Al ocultar las zonas, limpiar la selección de zona (su popup dejaría de tener sentido).
  const handleToggleZones = useCallback(() => {
    const next = !zonesVisible;
    setZonesVisible(next);
    if (!next) {
      setSelection((current) =>
        current?.kind === "risk-zone" ? null : current,
      );
    }
  }, [zonesVisible]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {!mapReady && !mapError && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <p className="rounded-md bg-white/90 px-3 py-2 text-xs text-slate-600 shadow ring-1 ring-slate-200">
            Cargando mapa…
          </p>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-50/95 p-4">
          <p role="alert" className="max-w-sm text-center text-sm text-red-700">
            No se pudo cargar el mapa. {mapError}
          </p>
        </div>
      )}

      {/* Fuente de datos separada de la representación: los mocks se reemplazarán por el backend. */}
      <ReportMarkers
        map={mapInstance}
        reports={filteredReports}
        onSelectReport={handleSelectReport}
      />

      <RiskZonesLayer
        map={mapInstance}
        data={MOCK_RISK_ZONES}
        visible={zonesVisible}
        onToggleVisibility={handleToggleZones}
        onSelectZone={handleSelectZone}
      />

      <MapSelectionPopup
        map={mapInstance}
        selection={selection}
        onClose={handleCloseSelection}
      />

      <ReportFiltersPanel
        filters={filters}
        onChange={setFilters}
        resultCount={filteredReports.length}
      />
    </div>
  );
}
