import { useEffect, useRef } from "react";
import { Map, setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";

// Configurar el Worker antes de crear el mapa
setWorkerUrl(workerUrl);

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [-108.47, 25.57],
      zoom: 12,
    });

    mapRef.current = map;

    map.on("load", () => {
      console.log("✅ Mapa cargado correctamente");
    });

    map.on("error", (event) => {
      console.error("❌ Error de MapLibre:", event.error);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
