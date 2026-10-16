import { CheckCircle2 } from "lucide-react";

export default function SafetyNotice() {
  return (
    <div
      role="note"
      aria-label="Aviso de seguridad"
      className="flex items-center gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-2.5 text-emerald-900"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
      <p className="text-xs font-medium leading-snug">
        No te expongas para tomar una fotografía.
      </p>
    </div>
  );
}
