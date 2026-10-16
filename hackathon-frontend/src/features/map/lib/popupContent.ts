import type { FloodReport } from "../types/report";
import {
  formatReportDate,
  getVerificationLabel,
  SEVERITY_LABELS,
} from "./reportLabels";

/**
 * Construye el contenido del popup de un reporte con nodos DOM y `textContent`,
 * evitando `innerHTML`/`setHTML` para no inyectar texto de usuarios.
 */
export function createReportPopupContent(report: FloodReport): HTMLElement {
  const container = document.createElement("div");
  container.className = "space-y-1 text-sm leading-snug text-slate-700";

  const title = document.createElement("p");
  title.className = "font-semibold text-slate-900";
  title.textContent = "Reporte ciudadano";

  const severity = document.createElement("p");
  severity.textContent = `Severidad reportada: ${SEVERITY_LABELS[report.severity]}`;

  const description = document.createElement("p");
  description.textContent = report.description;

  const verification = document.createElement("p");
  verification.textContent = `Verificación: ${getVerificationLabel(report)}`;

  const date = document.createElement("p");
  date.className = "text-xs text-slate-500";
  date.textContent = formatReportDate(report.createdAt);

  const disclaimer = document.createElement("p");
  disclaimer.className = "text-[10px] leading-tight text-slate-400";
  disclaimer.textContent =
    "Dato de demostración — reporte ciudadano, no información oficial.";

  container.append(title, severity, description, verification, date, disclaimer);
  return container;
}
