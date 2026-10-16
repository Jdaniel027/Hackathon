import type { RiskZoneCollection, ZoneStatus } from "../types/riskZone";
import { STATUS_LABELS } from "../lib/riskZoneStyles";

interface StatusTransitionDemoProps {
  zones: RiskZoneCollection;
  onCycleFirstZone: () => void;
}

/**
 * Control temporal de demostración (F1-04). Alterna el estado visual de una
 * zona mock para comprobar que color y categoría se actualizan en vivo sin
 * recrear el mapa. No forma parte del flujo público del MVP: se retirará
 * cuando las transiciones las confirme el backend.
 */
export default function StatusTransitionDemo({
  zones,
  onCycleFirstZone,
}: StatusTransitionDemoProps) {
  const zone = zones.features[0];
  if (!zone) return null;

  const nextStatus: ZoneStatus =
    zone.properties.status === "at_risk" ? "flooded" : "at_risk";

  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
      <button
        type="button"
        onClick={onCycleFirstZone}
        className="pointer-events-auto inline-flex min-h-11 items-center rounded-md bg-white/95 px-3 text-xs font-medium text-slate-700 shadow ring-1 ring-slate-200 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Demo · {zone.properties.name}: {STATUS_LABELS[zone.properties.status]} →{" "}
        {STATUS_LABELS[nextStatus]}
      </button>
    </div>
  );
}
