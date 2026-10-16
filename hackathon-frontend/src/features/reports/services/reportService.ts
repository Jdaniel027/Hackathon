import type {
  CreateReportInput,
  CreatedReportResponse,
} from "../types/citizenReport";

/**
 * Servicio simulado para el envío de reportes ciudadanos según API_CONTRACT.md.
 * Cumple con D-003: no publica el reporte en el mapa ni cambia el color de las zonas;
 * retorna acuse de recibo privado con estado 'pending' sujeto a verificación.
 */
export async function submitCitizenReport(
  input: CreateReportInput,
): Promise<CreatedReportResponse> {
  if (!input.location) {
    throw new Error("La ubicación del incidente es obligatoria.");
  }
  if (!input.photo) {
    throw new Error("La fotografía es obligatoria.");
  }

  // Simulación de latencia de red (600ms)
  await new Promise((resolve) => setTimeout(resolve, 600));

  return {
    id: `rep-${Date.now()}`,
    status: "pending",
    message: "Reporte recibido correctamente y pendiente de verificación.",
    createdAt: new Date().toISOString(),
  };
}
