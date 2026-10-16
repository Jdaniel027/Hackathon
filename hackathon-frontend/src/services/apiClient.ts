/**
 * Cliente HTTP único de la aplicación (F1). Todas las llamadas a la API de
 * AquaReport pasan por aquí para centralizar la URL base y el manejo de errores.
 *
 * La URL base se configura con `VITE_API_BASE_URL` (ver `.env.example`). El
 * valor por defecto apunta al backend local (`hackaton-backend`).
 */

const DEFAULT_BASE_URL = "http://localhost:3000/api/v1";

/** URL base de la API, sin barra final. */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_BASE_URL;

/** Error de una respuesta HTTP no exitosa. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * `GET` a la API. `path` es relativo a la base (p. ej. `/mapa/mazatlan`).
 * Lanza `ApiError` en respuestas no 2xx y deja propagar el error de red
 * (`TypeError`) cuando no se puede contactar al servidor.
 */
export async function apiGet<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new ApiError(
      `La API respondió ${response.status} ${response.statusText}`.trim(),
      response.status,
    );
  }

  return (await response.json()) as T;
}
