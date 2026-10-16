import { useEffect, useRef } from "react";
import type { GeoJSONSource, Map, MapLayerMouseEvent } from "maplibre-gl";

import type {
  RiskZoneCollection,
  RiskZoneProperties,
  ZoneStatus,
} from "../types/riskZone";
import {
  STATUS_BORDER_COLORS,
  STATUS_FILL_COLORS,
  ZONE_STATUSES,
} from "../lib/riskZoneStyles";
import type { StatusVisibility } from "../lib/zoneFilters";
import RiskZonesFilters from "./RiskZonesFilters";

const SOURCE_ID = "risk-zones";

/**
 * Una capa (relleno y borde) por cada estado, para poder alternar cada filtro
 * de forma independiente: Huracán (`at_risk`) e Inundadas (`flooded`).
 */
const FILL_LAYER_IDS: Record<ZoneStatus, string> = {
  at_risk: "risk-zones-at-risk-fill",
  flooded: "risk-zones-flooded-fill",
};

const LINE_LAYER_IDS: Record<ZoneStatus, string> = {
  at_risk: "risk-zones-at-risk-line",
  flooded: "risk-zones-flooded-line",
};

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
  statusVisibility: StatusVisibility;
  onToggleStatus: (status: ZoneStatus) => void;
  onSelectZone: (zone: RiskZoneProperties, lngLat: [number, number]) => void;
}

/**
 * Capa GeoJSON de zonas de riesgo. Cada estado vive en su propia capa y su
 * visibilidad la controla el padre mediante los dos filtros independientes.
 * Un grupo oculto deja de renderizarse y, por tanto, tampoco es seleccionable.
 * La detección de la selección se notifica hacia arriba; la presentación vive
 * en `MapSelectionPopup`.
 */
export default function RiskZonesLayer({
  map,
  data,
  statusVisibility,
  onToggleStatus,
  onSelectZone,
}: RiskZonesLayerProps) {
  const statusVisibilityRef = useRef(statusVisibility);
  const onSelectRef = useRef(onSelectZone);

  useEffect(() => {
    statusVisibilityRef.current = statusVisibility;
  }, [statusVisibility]);

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

      for (const status of ZONE_STATUSES) {
        const visibility = statusVisibilityRef.current[status]
          ? "visible"
          : "none";
        const fillId = FILL_LAYER_IDS[status];
        const lineId = LINE_LAYER_IDS[status];

        if (!map.getLayer(fillId)) {
          map.addLayer({
            id: fillId,
            type: "fill",
            source: SOURCE_ID,
            filter: ["==", ["get", "status"], status],
            layout: { visibility },
            paint: {
              "fill-color": STATUS_FILL_COLORS[status],
              "fill-opacity": 0.35,
            },
          });
        }

        if (!map.getLayer(lineId)) {
          map.addLayer({
            id: lineId,
            type: "line",
            source: SOURCE_ID,
            filter: ["==", ["get", "status"], status],
            layout: { visibility },
            paint: {
              "line-color": STATUS_BORDER_COLORS[status],
              "line-width": 1.5,
              "line-opacity": 0.9,
            },
          });
        }
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

  // Alterna cada filtro sin recrear las capas ni duplicar polígonos.
  useEffect(() => {
    if (!map) return;

    for (const status of ZONE_STATUSES) {
      const value = statusVisibility[status] ? "visible" : "none";
      if (map.getLayer(FILL_LAYER_IDS[status])) {
        map.setLayoutProperty(FILL_LAYER_IDS[status], "visibility", value);
      }
      if (map.getLayer(LINE_LAYER_IDS[status])) {
        map.setLayoutProperty(LINE_LAYER_IDS[status], "visibility", value);
      }
    }
  }, [map, statusVisibility]);

  // Detección de selección: popup delegado al padre. Las capas ocultas por su
  // filtro no generan features, así que tampoco son seleccionables.
  useEffect(() => {
    if (!map || !hasValidData) return;

    const fillLayerIds = ZONE_STATUSES.map((status) => FILL_LAYER_IDS[status]);

    const handleClick = (event: MapLayerMouseEvent) => {
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
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    for (const id of fillLayerIds) {
      map.on("click", id, handleClick);
      map.on("mouseenter", id, handleMouseEnter);
      map.on("mouseleave", id, handleMouseLeave);
    }

    return () => {
      for (const id of fillLayerIds) {
        map.off("click", id, handleClick);
        map.off("mouseenter", id, handleMouseEnter);
        map.off("mouseleave", id, handleMouseLeave);
      }
    };
  }, [map, hasValidData]);

  // Limpieza de capas y fuente al desmontar o cambiar de mapa.
  useEffect(() => {
    if (!map) return;

    return () => {
      for (const status of ZONE_STATUSES) {
        if (map.getLayer(LINE_LAYER_IDS[status])) {
          map.removeLayer(LINE_LAYER_IDS[status]);
        }
        if (map.getLayer(FILL_LAYER_IDS[status])) {
          map.removeLayer(FILL_LAYER_IDS[status]);
        }
      }
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map]);

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
      {hasValidData && !isEmpty && (
        <RiskZonesFilters
          statusVisibility={statusVisibility}
          onToggleStatus={onToggleStatus}
        />
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
