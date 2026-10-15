/**
 * Modelo mínimo de reporte ciudadano para su visualización en el mapa.
 * Solo incluye los campos necesarios para pintar marcadores y popups.
 * Cuando el backend defina el contrato definitivo, este tipo podrá alinearse
 * o reemplazarse sin tocar la lógica de marcadores.
 */
export type FloodSeverity = "low" | "medium" | "high";

/**
 * Estado de verificación de un reporte (opcional).
 * No se marca automáticamente como "verified": la verificación la determina
 * un proceso humano/institucional, nunca la presencia en el mapa.
 */
export type ReportVerificationStatus = "pending" | "verified" | "rejected";

export interface FloodReport {
  id: string;
  latitude: number;
  longitude: number;
  description: string;
  severity: FloodSeverity;
  createdAt: string;
  /** Opcional: tolerar reportes sin estado de verificación. */
  verificationStatus?: ReportVerificationStatus;
}
