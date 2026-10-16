import { AlertTriangle } from "lucide-react";

interface CompactZoneCardProps {
  zoneName?: string;
  riskStatusText?: string;
  onClick?: () => void;
}

export default function CompactZoneCard({
  zoneName = "Guasave",
  riskStatusText = "Zona de riesgo alto",
  onClick,
}: CompactZoneCardProps) {
  return (
    <div
      role="region"
      aria-label="Información resumida de la zona"
      onClick={onClick}
      className="absolute inset-x-0 bottom-0 z-10 rounded-t-3xl bg-white px-5 pt-3 pb-6 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] ring-1 ring-slate-100 transition-all select-none"
    >
      {/* Tirador de arrastre */}
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <AlertTriangle className="h-5 w-5 stroke-[2.2]" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900 leading-tight">
            {zoneName}
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            {riskStatusText}
          </p>
        </div>
      </div>
    </div>
  );
}
