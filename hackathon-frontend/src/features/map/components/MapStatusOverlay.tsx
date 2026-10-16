interface MapStatusOverlayProps {
  ready: boolean;
  error: string | null;
}

/**
 * Mensajes superpuestos del estado del mapa: error de inicialización (tiene
 * prioridad) o indicador de carga mientras el estilo no está listo.
 */
export default function MapStatusOverlay({
  ready,
  error,
}: MapStatusOverlayProps) {
  if (error) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-50/95 p-4">
        <p role="alert" className="max-w-sm text-center text-sm text-red-700">
          No se pudo cargar el mapa. {error}
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <p className="rounded-md bg-white/90 px-3 py-2 text-xs text-slate-600 shadow ring-1 ring-slate-200">
          Cargando mapa…
        </p>
      </div>
    );
  }

  return null;
}
