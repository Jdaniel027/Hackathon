import { Droplet } from "lucide-react";
import type { Coordinates } from "../../reports/types/citizenReport";

interface LocationPickerOverlayProps {
  currentCoordinates: Coordinates | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LocationPickerOverlay({
  currentCoordinates,
  onConfirm,
  onCancel,
}: LocationPickerOverlayProps) {
  return (
    <>
      {/* Pin fijo centrado en pantalla con efecto 3D sobre el mapa */}
      <div
        className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center pb-12"
        aria-hidden="true"
      >
        <div className="relative flex flex-col items-center animate-bounce duration-1000">
          {/* Marcador azul en forma de gota con icono de agua */}
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full rounded-br-none bg-sky-500 text-white shadow-lg -rotate-45 ring-2 ring-white">
            <Droplet className="h-5 w-5 rotate-45 fill-white text-white" />
          </div>
          {/* Sombra de apoyo sobre el suelo del mapa */}
          <div className="mt-1 h-2 w-4 rounded-full bg-black/25 blur-[1px]" />
        </div>
      </div>

      {/* Drawer inferior con tirador, título y botón Confirmar */}
      <section
        role="dialog"
        aria-label="Panel de selección de ubicación"
        className="absolute inset-x-0 bottom-0 z-40 rounded-t-3xl bg-white p-5 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] ring-1 ring-slate-200"
      >
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-slate-300" />

        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Seleccionar ubicación
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-slate-400 hover:text-slate-600 transition p-1"
            >
              Cancelar
            </button>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Coloca el marcador en la ubicación
          </p>

          {currentCoordinates && (
            <p className="mt-1 font-mono text-[11px] text-slate-400">
              {currentCoordinates.latitude.toFixed(5)}, {currentCoordinates.longitude.toFixed(5)}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="w-full rounded-2xl bg-sky-100 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-200 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
        >
          Confirmar
        </button>
      </section>
    </>
  );
}
