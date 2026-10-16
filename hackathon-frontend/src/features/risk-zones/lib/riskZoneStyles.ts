import type { RiskLevel, ZoneStatus } from "../types/riskZone";

/**
 * Colores del estado visual público.
 * Amarillo = zona de riesgo por huracán; rojo = zona inundada confirmada.
 * Los valores de la paleta están pendientes de formalizar en el sistema de
 * diseño; se centralizan aquí para no dispersarlos.
 */
export const STATUS_FILL_COLORS: Record<ZoneStatus, string> = {
  at_risk: "#facc15",
  flooded: "#ef4444",
};

export const STATUS_BORDER_COLORS: Record<ZoneStatus, string> = {
  at_risk: "#ca8a04",
  flooded: "#b91c1c",
};

export const STATUS_LABELS: Record<ZoneStatus, string> = {
  at_risk: "Zona de riesgo por huracán",
  flooded: "Zona inundada",
};

/**
 * Rótulos cortos de los dos filtros independientes del mapa (F1-06).
 * Distintos de `STATUS_LABELS` (texto largo para leyenda/detalle).
 */
export const FILTER_LABELS: Record<ZoneStatus, string> = {
  at_risk: "Huracán",
  flooded: "Inundadas",
};

export const ZONE_STATUSES: ZoneStatus[] = ["at_risk", "flooded"];

/** Etiquetas del nivel de riesgo histórico (contexto, no estado visual). */
export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
  unknown: "Sin clasificar",
};
