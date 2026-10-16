import { useEffect } from "react";
import { Marker } from "maplibre-gl";
import type { Map } from "maplibre-gl";

import type { FloodReport } from "../types/report";
import { SEVERITY_COLORS, SEVERITY_LABELS } from "../lib/reportLabels";

/**
 * Marcador circular propio (distinto de los polígonos de zona) con área táctil
 * de 44px. El color codifica la severidad reportada, no un riesgo calculado.
 */
function createReportMarkerElement(report: FloodReport): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.setAttribute(
    "aria-label",
    `Reporte ciudadano, severidad ${SEVERITY_LABELS[report.severity].toLowerCase()}`,
  );
  element.className =
    "flex h-11 w-11 cursor-pointer items-center justify-center";

  const dot = document.createElement("span");
  dot.className = "block h-4 w-4 rounded-full border-2 border-white shadow-md";
  dot.style.backgroundColor = SEVERITY_COLORS[report.severity];
  if (report.verificationStatus === "rejected") {
    dot.style.opacity = "0.45";
  }

  element.appendChild(dot);
  return element;
}

interface ReportMarkersProps {
  map: Map | null;
  reports: FloodReport[];
  onSelectReport: (report: FloodReport, lngLat: [number, number]) => void;
}

/**
 * Detecta la selección de un reporte y la notifica hacia arriba. No construye
 * la presentación (popup): eso lo resuelve `MapSelectionPopup`.
 */
export default function ReportMarkers({
  map,
  reports,
  onSelectReport,
}: ReportMarkersProps) {
  useEffect(() => {
    if (!map) return;

    const entries = reports.map((report) => {
      const element = createReportMarkerElement(report);

      // `stopPropagation` evita que el clic llegue al mapa y seleccione una
      // zona de riesgo situada debajo del marcador.
      const handleClick = (event: MouseEvent) => {
        event.stopPropagation();
        onSelectReport(report, [report.longitude, report.latitude]);
      };
      element.addEventListener("click", handleClick);

      const marker = new Marker({ element })
        .setLngLat([report.longitude, report.latitude])
        .addTo(map);

      return { marker, element, handleClick };
    });

    return () => {
      entries.forEach(({ marker, element, handleClick }) => {
        element.removeEventListener("click", handleClick);
        marker.remove();
      });
    };
  }, [map, reports, onSelectReport]);

  return null;
}
