import { useEffect } from "react";
import { Marker } from "maplibre-gl";
import type { Map } from "maplibre-gl";

/**
 * Dibuja el «punto azul» con la posición del usuario (F1-11) usando el estilo
 * propio de MapLibre (`maplibregl-user-location-dot`: punto azul con anillo
 * blanco y pulso, que respeta `prefers-reduced-motion`). Se elimina el marcador
 * cuando no hay coordenadas (p. ej. permiso denegado) o al desmontar.
 */
export function useUserLocationMarker(
  map: Map | null,
  coordinates: [number, number] | null,
): void {
  useEffect(() => {
    if (!map || !coordinates) return;

    const element = document.createElement("div");
    element.className = "maplibregl-user-location-dot";
    element.setAttribute("aria-hidden", "true");

    const marker = new Marker({ element }).setLngLat(coordinates).addTo(map);

    return () => {
      marker.remove();
    };
  }, [map, coordinates]);
}
