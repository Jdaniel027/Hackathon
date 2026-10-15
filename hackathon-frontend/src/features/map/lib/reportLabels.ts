import type {
  FloodReport,
  FloodSeverity,
  ReportVerificationStatus,
} from "../types/report";

export const SEVERITY_COLORS: Record<FloodSeverity, string> = {
  low: "#16a34a",
  medium: "#f59e0b",
  high: "#dc2626",
};

export const SEVERITY_LABELS: Record<FloodSeverity, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

export const VERIFICATION_LABELS: Record<ReportVerificationStatus, string> = {
  pending: "Pendiente de verificación",
  verified: "Corroborado",
  rejected: "Descartado",
};

/** Etiqueta legible del estado de verificación, tolerando su ausencia. */
export function getVerificationLabel(report: FloodReport): string {
  return report.verificationStatus
    ? VERIFICATION_LABELS[report.verificationStatus]
    : "Sin estado de verificación";
}

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatReportDate(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : dateFormatter.format(date);
}
