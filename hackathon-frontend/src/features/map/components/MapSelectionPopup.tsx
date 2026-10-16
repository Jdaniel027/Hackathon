import { useEffect, useRef } from "react";
import { Popup } from "maplibre-gl";
import type { Map, MapMouseEvent } from "maplibre-gl";

import type { MapSelection } from "../types/selection";
import { createReportPopupContent } from "../lib/popupContent";
import { createRiskZonePopupContent } from "../../risk-zones/lib/popupContent";

interface MapSelectionPopupProps {
  map: Map | null;
  selection: MapSelection | null;
  onClose: () => void;
}

/**
 * Presentación temporal de la selección activa mediante un popup de MapLibre.
 *
 * No detecta elementos ni conoce los datos del dominio: solo recibe la
 * selección ya resuelta y la pinta. Cuando exista el diseño definitivo, este
 * componente puede reemplazarse por un panel lateral o bottom sheet sin tocar
 * la detección ni el estado de selección.
 */
export default function MapSelectionPopup({
  map,
  selection,
  onClose,
}: MapSelectionPopupProps) {
  const popupRef = useRef<Popup | null>(null);
  const onCloseRef = useRef(onClose);

  // Mantener la referencia al callback sin re-crear el popup.
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Un único popup por mapa; se elimina al desmontar o cambiar de mapa.
  useEffect(() => {
    if (!map) return;

    const popup = new Popup({
      closeButton: true,
      // El cierre por clic se gestiona aparte para no anular una selección
      // recién hecha por un manejador de capa (ver más abajo).
      closeOnClick: false,
      maxWidth: "min(280px, 80vw)",
    });
    popupRef.current = popup;

    const handleClose = () => onCloseRef.current();
    popup.on("close", handleClose);

    return () => {
      popup.off("close", handleClose);
      popup.remove();
      popupRef.current = null;
    };
  }, [map]);

  // Cierra la selección al hacer clic en el fondo del mapa. Un manejador de
  // capa (zonas de riesgo) llama a `preventDefault()` para no cerrar; los
  // marcadores detienen la propagación del DOM y no generan clic de mapa.
  useEffect(() => {
    if (!map) return;

    const handleMapClick = (event: MapMouseEvent) => {
      if (event.defaultPrevented) return;
      onCloseRef.current();
    };

    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [map]);

  // Reflejar la selección: abrir/actualizar o cerrar el popup.
  useEffect(() => {
    const popup = popupRef.current;
    if (!popup || !map) return;

    if (!selection) {
      if (popup.isOpen()) popup.remove();
      return;
    }

    const content =
      selection.kind === "report"
        ? createReportPopupContent(selection.report)
        : createRiskZonePopupContent(selection.zone);

    popup.setDOMContent(content).setLngLat(selection.lngLat);
    if (!popup.isOpen()) popup.addTo(map);
  }, [map, selection]);

  return null;
}
