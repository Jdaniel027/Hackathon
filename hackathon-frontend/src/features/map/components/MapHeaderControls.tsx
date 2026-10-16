import { LocateFixed, Menu } from "lucide-react";

interface MapHeaderControlsProps {
  onMenuClick?: () => void;
  onLocateClick?: () => void;
  isLocating?: boolean;
}

export default function MapHeaderControls({
  onMenuClick,
  onLocateClick,
  isLocating = false,
}: MapHeaderControlsProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
      {/* Botón de Menú hamburguesa */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Abrir menú de navegación"
        className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-800 shadow-md ring-1 ring-slate-200/60 transition hover:bg-slate-50 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
      >
        <Menu className="h-5 w-5 stroke-[2.2]" />
      </button>

      {/* Botón de Geolocalización */}
      <button
        type="button"
        onClick={onLocateClick}
        aria-label="Centrar en mi ubicación actual"
        disabled={isLocating}
        className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-sky-600 text-white shadow-md transition hover:bg-sky-700 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-60"
      >
        <LocateFixed className="h-5 w-5 stroke-[2.2]" />
      </button>
    </div>
  );
}
