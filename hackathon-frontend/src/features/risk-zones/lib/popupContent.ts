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

  if (zone.description) {
    const description = document.createElement("p");
    description.className = "text-xs text-slate-500";
    description.textContent = zone.description;
    container.append(description);
  }

  const disclaimer = document.createElement("p");
  disclaimer.className = "text-[10px] leading-tight text-slate-400";
  disclaimer.textContent =
    "Zona de demostración — no representa estado verificado.";
  container.append(disclaimer);

  return container;
}
