import { useCallback, useEffect, useRef, useState } from "react";
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
import { MOCK_RISK_ZONES } from "../../risk-zones/data/mockRiskZones";
import MapSelectionPopup from "./MapSelectionPopup";
import RiskZonesLayer from "../../risk-zones/components/RiskZonesLayer";
import StatusTransitionDemo from "../../risk-zones/components/StatusTransitionDemo";
import { applyZoneStatus } from "../../risk-zones/lib/zoneTransitions";
import type { MapSelection } from "../types/selection";
import type {
  RiskZoneCollection,
  RiskZoneProperties,
  ZoneStatus,
} from "../../risk-zones/types/riskZone";

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

  // Zonas en estado local para poder aplicar transiciones mock (F1-04) sin
  // recrear el mapa: el cambio de `data` se refleja vía `source.setData`.
  const [zones, setZones] = useState<RiskZoneCollection>(MOCK_RISK_ZONES);

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

  const handleSelectZone = useCallback(
    (zone: RiskZoneProperties, lngLat: [number, number]) => {
      setSelection({ kind: "risk-zone", lngLat, zone });
    },
    [],
  );

  const handleCloseSelection = useCallback(() => {
    setSelection(null);
  }, []);

  // Al ocultar las zonas, limpiar la selección (su popup dejaría de tener sentido).
  const handleToggleZones = useCallback(() => {
    const next = !zonesVisible;
    setZonesVisible(next);
    if (!next) setSelection(null);
  }, [zonesVisible]);

  // Transición mock (F1-04): alterna el estado de la primera zona para
  // comprobar que color y categoría se actualizan sin recrear el mapa.
  // No es flujo público; se retirará cuando el backend confirme los estados.
  const handleCycleFirstZone = useCallback(() => {
    const zone = zones.features[0];
    if (!zone) return;

    const nextStatus: ZoneStatus =
      zone.properties.status === "at_risk" ? "flooded" : "at_risk";
    const updated = applyZoneStatus(zones, zone.properties.id, nextStatus);
    setZones(updated);

    // Mantener coherente el popup si la zona transicionada estaba seleccionada.
    setSelection((current) => {
      if (!current || current.zone.id !== zone.properties.id) return current;
      const nextZone = updated.features.find(
        (feature) => feature.properties.id === current.zone.id,
      );
      return nextZone ? { ...current, zone: nextZone.properties } : current;
    });
  }, [zones]);

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
      <RiskZonesLayer
        map={mapInstance}
        data={zones}
        visible={zonesVisible}
        onToggleVisibility={handleToggleZones}
        onSelectZone={handleSelectZone}
      />

      {zonesVisible && (
        <StatusTransitionDemo
          zones={zones}
          onCycleFirstZone={handleCycleFirstZone}
        />
      )}

      <MapSelectionPopup
        map={mapInstance}
        selection={selection}
        onClose={handleCloseSelection}
      />
    </div>
  );
}
