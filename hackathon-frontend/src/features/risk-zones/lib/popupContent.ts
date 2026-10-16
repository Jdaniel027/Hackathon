import type { RiskZoneProperties } from "../types/riskZone";
import { RISK_LABELS, STATUS_LABELS } from "./riskZoneStyles";

/**
 * Construye el contenido del popup de una zona con nodos DOM y `textContent`,
 * evitando `innerHTML`/`setHTML` para no inyectar texto no confiable.
 */
export function createRiskZonePopupContent(zone: RiskZoneProperties): HTMLElement {
  const container = document.createElement("div");
  container.className = "space-y-1 text-sm leading-snug text-slate-700";

  const name = document.createElement("p");
  name.className = "font-semibold text-slate-900";
  name.textContent = zone.name;

  const status = document.createElement("p");
  status.textContent = STATUS_LABELS[zone.status];

  container.append(name, status);

  // El nivel de riesgo histórico es contexto distinto del estado visual.
  if (zone.riskLevel) {
    const level = document.createElement("p");
    level.className = "text-xs text-slate-500";
    level.textContent = `Nivel de riesgo histórico: ${RISK_LABELS[zone.riskLevel]}`;
    container.append(level);
  }

  // Zona circular: punto de origen + radio (contrato `ZonaRiesgoMapa`).
  if (zone.origin && typeof zone.radiusM === "number") {
    const radius = document.createElement("p");
    radius.className = "text-xs text-slate-500";
    radius.textContent = `Origen: ${zone.origin.lat.toFixed(5)}, ${zone.origin.lng.toFixed(5)} · Radio: ${zone.radiusM} m`;
    container.append(radius);
  }

  if (zone.description) {
    const description = document.createElement("p");
    description.className = "text-xs text-slate-500";
    description.textContent = zone.description;
    container.append(description);
  }

  return container;
}
