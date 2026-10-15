import { useEffect } from "react";
import { Marker, Popup } from "maplibre-gl";
import type { Map } from "maplibre-gl";

import type { FloodReport, FloodSeverity } from "../types/report";

const SEVERITY_COLORS: Record<FloodSeverity, string> = {
  low: "#16a34a",
  medium: "#f59e0b",
  high: "#dc2626",
};

const SEVERITY_LABELS: Record<FloodSeverity, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : dateFormatter.format(date);
}

/**
 * Construye el contenido del popup con nodos DOM y `textContent`,
 * evitando `innerHTML`/`setHTML` para no inyectar texto de usuarios.
 */
function createPopupContent(report: FloodReport): HTMLElement {
  const container = document.createElement("div");
  container.className = "space-y-1 text-sm leading-snug text-slate-700";

  const severity = document.createElement("p");
  severity.className = "font-semibold text-slate-900";
  severity.textContent = `Severidad: ${SEVERITY_LABELS[report.severity]}`;

  const description = document.createElement("p");
  description.textContent = report.description;

  const date = document.createElement("p");
  date.className = "text-xs text-slate-500";
  date.textContent = formatDate(report.createdAt);

  container.append(severity, description, date);
  return container;
}

interface ReportMarkersProps {
  map: Map | null;
  reports: FloodReport[];
}

export default function ReportMarkers({ map, reports }: ReportMarkersProps) {
  useEffect(() => {
    if (!map) return;

    const markers = reports.map((report) =>
      new Marker({ color: SEVERITY_COLORS[report.severity] })
        .setLngLat([report.longitude, report.latitude])
        .setPopup(
          new Popup({
            offset: 24,
            maxWidth: "min(260px, 75vw)",
            closeButton: true,
            closeOnClick: true,
          }).setDOMContent(createPopupContent(report)),
        )
        .addTo(map),
    );

    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [map, reports]);

  return null;
}
