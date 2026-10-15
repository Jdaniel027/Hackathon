/**
 * Modelo mínimo de reporte ciudadano para su visualización en el mapa.
 * Solo incluye los campos necesarios para pintar marcadores y popups.
 * Cuando el backend defina el contrato definitivo, este tipo podrá alinearse
 * o reemplazarse sin tocar la lógica de marcadores.
 */
export type FloodSeverity = "low" | "medium" | "high";

export interface FloodReport {
  id: string;
  latitude: number;
  longitude: number;
  description: string;
  severity: FloodSeverity;
  createdAt: string;
}
