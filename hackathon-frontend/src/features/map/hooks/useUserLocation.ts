import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Estado de la ubicación del usuario.
 * - `idle`: todavía no se ha pedido.
 * - `locating`: solicitud en curso.
 * - `available`: posición obtenida.
 * - `denied`: permiso denegado por el usuario.
 * - `unavailable`: el navegador no soporta o no puede obtener la posición.
 * - `error`: error genérico (p. ej. timeout).
 */
export type LocationStatus =
  | "idle"
  | "locating"
  | "available"
  | "denied"
  | "unavailable"
  | "error";

/** Códigos de error de la API de geolocalización (W3C). */
const GEOLOCATION_DENIED = 1;
const GEOLOCATION_UNAVAILABLE = 2;

interface UseUserLocationResult {
  status: LocationStatus;
  /** `[longitud, latitud]`, en el orden que espera MapLibre. */
  coordinates: [number, number] | null;
  /** Solicita la ubicación actual; el permiso se pide en este momento. */
  locate: () => void;
}

function mapErrorCode(code: number): LocationStatus {
  if (code === GEOLOCATION_DENIED) return "denied";
  if (code === GEOLOCATION_UNAVAILABLE) return "unavailable";
  return "error";
}

/**
 * Geolocalización del mapa (F1-11). Solicita la posición solo cuando se llama
 * a `locate` (nunca al cargar) y expone el estado para informar de permisos
 * denegados y errores. El centrado del mapa lo realiza quien lo consume.
 */
export function useUserLocation(): UseUserLocationResult {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mountedRef.current) return;
        setCoordinates([
          position.coords.longitude,
          position.coords.latitude,
        ]);
        setStatus("available");
      },
      (error) => {
        if (!mountedRef.current) return;
        setCoordinates(null);
        setStatus(mapErrorCode(error.code));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  return { status, coordinates, locate };
}
