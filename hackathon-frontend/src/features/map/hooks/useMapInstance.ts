import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Map, setWorkerUrl } from "maplibre-gl";
import type { ErrorEvent } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";

import { MAP_CONFIG } from "../config/map.config";

// Configurar el Worker una sola vez, antes de instanciar el mapa.
setWorkerUrl(workerUrl);

interface UseMapInstanceResult {
  containerRef: RefObject<HTMLDivElement | null>;
  map: Map | null;
  ready: boolean;
  error: string | null;
}

/**
 * Aísla el ciclo de vida de MapLibre: crea la instancia con `MAP_CONFIG` y los
 * listeners de carga y error, y libera todo al desmontar. Sin controles
 * nativos: el diseño define menú ☰ (izquierda) y botón de ubicación (derecha);
 * el zoom se hace con rueda o pellizco. La ubicación vive en `LocateControl`.
 */
export function useMapInstance(): UseMapInstanceResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let instance: Map | null = null;
    let initError: string | null = null;
    try {
      instance = new Map({
        container: containerRef.current,
        style: MAP_CONFIG.style,
        center: MAP_CONFIG.center,
        zoom: MAP_CONFIG.zoom,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom,
      });
    } catch (caught) {
      console.error("❌ No se pudo inicializar el mapa:", caught);
      initError =
        caught instanceof Error
          ? caught.message
          : "No se pudo inicializar el mapa.";
    }

    // setState en el bloque dominante del efecto (no dentro del catch).
    setError(initError);
    if (!instance) return;

    mapRef.current = instance;
    setMap(instance);

    // Sin controles nativos (zoom/brújula retirados por diseño: la esquina
    // superior derecha la ocupa el botón de ubicación).

    // Ubicación del usuario: la gestiona `LocateControl`/`useUserLocation`.

    const handleLoad = () => setReady(true);
    const handleMapError = (event: ErrorEvent) => {
      console.error("❌ Error de MapLibre:", event.error);
    };

    instance.on("load", handleLoad);
    instance.on("error", handleMapError);

    return () => {
      instance.off("load", handleLoad);
      instance.off("error", handleMapError);
      instance.remove();
      mapRef.current = null;
    };
  }, []);

  return { containerRef, map, ready, error };
}
