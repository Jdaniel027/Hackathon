import { Camera } from "lucide-react";

interface ReportFabProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function ReportFab({ onClick, disabled = false }: ReportFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Reportar inundación con fotografía"
      className="absolute bottom-6 right-5 z-20 flex h-13 w-13 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Camera className="h-6 w-6 stroke-[2.2]" />
    </button>
  );
}
