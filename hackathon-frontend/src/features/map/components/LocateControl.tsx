import type { LocationStatus } from "../hooks/useUserLocation";

interface LocateControlProps {
  status: LocationStatus;
  onLocate: () => void;
}

const ERROR_MESSAGES: Partial<Record<LocationStatus, string>> = {
  denied: "Permiso de ubicación denegado.",
  unavailable: "Ubicación no disponible.",
  error: "No se pudo obtener la ubicación.",
};

/**
 * Control de ubicación (F1-11): botón circular azul con el icono de «mi
 * ubicación», en la esquina superior derecha y a la misma altura que el menú ☰
 * (`top-3`). Al pulsarlo solicita la posición y centra el mapa (lo hace su
 * contenedor) y muestra el estado en curso o el error de permiso.
 *
 * El azul (`#1da1f2`) es provisional: coincide con el punto de ubicación de
 * MapLibre y queda pendiente de formalizar como token del sistema de diseño.
 */
export default function LocateControl({
  status,
  onLocate,
}: LocateControlProps) {
  const locating = status === "locating";
  const message = ERROR_MESSAGES[status];

  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={onLocate}
        disabled={locating}
        aria-busy={locating}
        aria-label="Mi ubicación"
        title="Mi ubicación"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1da1f2] text-white shadow-md transition hover:bg-[#1a91da] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`h-5 w-5 ${locating ? "animate-pulse" : ""}`}
        >
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="8" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
        </svg>
      </button>

      {message && (
        <p
          role="alert"
          className="max-w-44 rounded-md bg-white/95 p-2 text-[10px] leading-tight text-red-700 shadow ring-1 ring-red-200"
        >
          {message}
        </p>
      )}
    </div>
  );
}
