import type { RiskLevel } from "../types/riskZone";

export const RISK_FILL_COLORS: Record<RiskLevel, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
};

export const RISK_BORDER_COLORS: Record<RiskLevel, string> = {
  low: "#15803d",
  medium: "#b45309",
  high: "#b91c1c",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

export const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high"];
