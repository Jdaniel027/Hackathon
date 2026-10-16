import { useEffect, useRef } from "react";
import type { GeoJSONSource, Map, MapLayerMouseEvent } from "maplibre-gl";

import type { RiskZoneCollection, RiskZoneProperties } from "../types/riskZone";
import {
  STATUS_BORDER_COLORS,
  STATUS_FILL_COLORS,
  STATUS_LABELS,
  ZONE_STATUSES,
} from "../lib/riskZoneStyles";

const SOURCE_ID = "risk-zones";
const FILL_LAYER_ID = "risk-zones-fill";
const LINE_LAYER_ID = "risk-zones-line";

/** Validación mínima para no registrar datos GeoJSON inválidos. */
function isValidCollection(
  data: RiskZoneCollection | null | undefined,
): data is RiskZoneCollection {
  return (
    !!data &&
    data.type === "FeatureCollection" &&
    Array.isArray(data.features)
  );
}

interface RiskZonesLayerProps {
  map: Map | null;
  data: RiskZoneCollection;
  visible: boolean;
  onToggleVisibility: () => void;
  onSelectZone: (zone: RiskZoneProperties, lngLat: [number, number]) => void;
}

/**
 * Capa GeoJSON de zonas de riesgo. La visibilidad es controlada por el padre
 * para que este pueda limpiar la selección cuando las zonas se ocultan.
 * La detección de la selección se notifica hacia arriba; la presentación vive
 * en `MapSelectionPopup`.
 */
export default function RiskZonesLayer({
  map,
  data,
  visible,
  onToggleVisibility,
  onSelectZone,
}: RiskZonesLayerProps) {
  const visibleRef = useRef(visible);
  const onSelectRef = useRef(onSelectZone);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    onSelectRef.current = onSelectZone;
  }, [onSelectZone]);

  const hasValidData = isValidCollection(data);
  const isEmpty = hasValidData && data.features.length === 0;

  // Crea la fuente y las capas cuando el estilo está listo y mantiene los datos al día.
  useEffect(() => {
    if (!map || !hasValidData) return;

    const syncSourceAndLayers = () => {
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (source) {
        source.setData(data);
      } else {
        map.addSource(SOURCE_ID, { type: "geojson", data });
      }

      const visibility = visibleRef.current ? "visible" : "none";

      if (!map.getLayer(FILL_LAYER_ID)) {
        map.addLayer({
          id: FILL_LAYER_ID,
          type: "fill",
          source: SOURCE_ID,
          layout: { visibility },
          paint: {
            // El color depende del estado visual público. Fallback a `at_risk`
            // (amarillo) para no pintar de rojo sin confirmación del backend.
            "fill-color": [
              "match",
              ["get", "status"],
              "flooded",
              STATUS_FILL_COLORS.flooded,
              STATUS_FILL_COLORS.at_risk,
            ],
            "fill-opacity": 0.35,
          },
        });
      }

      if (!map.getLayer(LINE_LAYER_ID)) {
        map.addLayer({
          id: LINE_LAYER_ID,
          type: "line",
          source: SOURCE_ID,
          layout: { visibility },
          paint: {
            "line-color": [
              "match",
              ["get", "status"],
              "flooded",
              STATUS_BORDER_COLORS.flooded,
              STATUS_BORDER_COLORS.at_risk,
            ],
            "line-width": 1.5,
            "line-opacity": 0.9,
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      syncSourceAndLayers();
    } else {
      map.once("load", syncSourceAndLayers);
    }

    return () => {
      map.off("load", syncSourceAndLayers);
    };
  }, [map, data, hasValidData]);

  // Alterna la visibilidad de las capas sin recrearlas.
  useEffect(() => {
    if (!map) return;

    const value = visible ? "visible" : "none";
    if (map.getLayer(FILL_LAYER_ID)) {
      map.setLayoutProperty(FILL_LAYER_ID, "visibility", value);
    }
    if (map.getLayer(LINE_LAYER_ID)) {
      map.setLayoutProperty(LINE_LAYER_ID, "visibility", value);
    }
  }, [map, visible]);

  // Detección de selección: popup delegado al padre. Las capas ocultas no
  // generan features, así que tampoco son seleccionables; la guarda lo refuerza.
  useEffect(() => {
    if (!map || !hasValidData) return;

    const handleClick = (event: MapLayerMouseEvent) => {
      if (!visibleRef.current) return;
      const feature = event.features?.[0];
      if (!feature?.properties) return;

      // Evita que el manejador de fondo del mapa cierre la selección recién hecha.
      event.preventDefault();

      onSelectRef.current(feature.properties as RiskZoneProperties, [
        event.lngLat.lng,
        event.lngLat.lat,
      ]);
    };

    const handleMouseEnter = () => {
      if (!visibleRef.current) return;
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", FILL_LAYER_ID, handleClick);
    map.on("mouseenter", FILL_LAYER_ID, handleMouseEnter);
    map.on("mouseleave", FILL_LAYER_ID, handleMouseLeave);

    return () => {
      map.off("click", FILL_LAYER_ID, handleClick);
      map.off("mouseenter", FILL_LAYER_ID, handleMouseEnter);
      map.off("mouseleave", FILL_LAYER_ID, handleMouseLeave);
    };
  }, [map, hasValidData]);

  // Limpieza de capas y fuente al desmontar o cambiar de mapa.
  useEffect(() => {
    if (!map) return;

    return () => {
      if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
      if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map]);

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
      {hasValidData && !isEmpty && (
        <button
          type="button"
          onClick={onToggleVisibility}
          aria-pressed={visible}
          className="pointer-events-auto inline-flex min-h-11 items-center rounded-md bg-white/95 px-3 text-xs font-medium text-slate-700 shadow ring-1 ring-slate-200 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {visible ? "Ocultar zonas" : "Mostrar zonas"}
        </button>
      )}

      {hasValidData && !isEmpty && visible && (
        <div className="pointer-events-auto rounded-md bg-white/95 p-2 shadow ring-1 ring-slate-200">
          <ul className="space-y-1 text-[11px] text-slate-600">
            {ZONE_STATUSES.map((status) => (
              <li key={status} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: STATUS_FILL_COLORS[status] }}
                />
                {STATUS_LABELS[status]}
              </li>
            ))}
          </ul>
          <p className="mt-1 max-w-36 text-[10px] leading-tight text-slate-400">
            Zonas de demostración — no representan estados verificados
          </p>
        </div>
      )}

      {!hasValidData && (
        <p
          role="alert"
          className="pointer-events-auto max-w-44 rounded-md bg-white/95 p-2 text-[10px] leading-tight text-red-700 shadow ring-1 ring-red-200"
        >
          No se pudieron cargar las zonas de riesgo (datos no válidos).
        </p>
      )}

      {isEmpty && (
        <p
          role="status"
          className="pointer-events-auto max-w-44 rounded-md bg-white/95 p-2 text-[10px] leading-tight text-slate-500 shadow ring-1 ring-slate-200"
        >
          No hay zonas de riesgo disponibles.
        </p>
      )}
    </div>
  );
}
