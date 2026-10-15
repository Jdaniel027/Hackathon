import { useEffect, useRef, useState } from "react";
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
import ReportMarkers from "./ReportMarkers";

// Configurar el Worker antes de crear el mapa
setWorkerUrl(workerUrl);

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [mapInstance, setMapInstance] = useState<Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new Map({
      container: containerRef.current,
      style: MAP_CONFIG.style,
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
    });

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

  return (
    <div ref={containerRef} className="h-full w-full">
      {/* Fuente de datos separada de la representación: los mocks se reemplazarán por el backend. */}
      <ReportMarkers map={mapInstance} reports={MOCK_FLOOD_REPORTS} />
    </div>
  );
}
