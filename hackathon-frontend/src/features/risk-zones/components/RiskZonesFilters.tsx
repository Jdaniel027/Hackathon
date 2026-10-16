import { useState } from "react";

import type { ZoneStatus } from "../types/riskZone";
import {
  FILTER_LABELS,
  STATUS_FILL_COLORS,
  ZONE_STATUSES,
} from "../lib/riskZoneStyles";
import type { StatusVisibility } from "../lib/zoneFilters";

const PANEL_ID = "risk-zones-filters-panel";

interface RiskZonesFiltersProps {
  statusVisibility: StatusVisibility;
  onToggleStatus: (status: ZoneStatus) => void;
}

/**
 * Menú de filtros en forma de botón desplegable (F1-06). Colapsado muestra
 * solo el botón «Filtros»; al pulsarlo despliega las dos opciones
 * independientes —«Huracán» (`at_risk`) e «Inundadas» (`flooded`)— para
 * mostrar u ocultar cada grupo de zonas en el mapa (F1-07 / F1-08).
 */
export default function RiskZonesFilters({
  statusVisibility,
  onToggleStatus,
}: RiskZonesFiltersProps) {
  const [open, setOpen] = useState(false);
  const activeCount = ZONE_STATUSES.filter(
    (status) => statusVisibility[status],
  ).length;

  return (
    <div className="pointer-events-auto flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        className="inline-flex min-h-11 items-center gap-2 rounded-md bg-white/95 px-3 text-xs font-medium text-slate-700 shadow ring-1 ring-slate-200 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Filtros
        <span
          aria-label={`${activeCount} de ${ZONE_STATUSES.length} filtros activos`}
          className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-600"
        >
          {activeCount}/{ZONE_STATUSES.length}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3.5 w-3.5 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          id={PANEL_ID}
          className="rounded-md bg-white/95 p-2 shadow ring-1 ring-slate-200"
        >
          <ul className="flex flex-col gap-1">
            {ZONE_STATUSES.map((status) => {
              const enabled = statusVisibility[status];
              return (
                <li key={status}>
                  <button
                    type="button"
                    onClick={() => onToggleStatus(status)}
                    aria-pressed={enabled}
                    className={`inline-flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      enabled
                        ? "bg-slate-100 text-slate-700"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-3 w-3 shrink-0 rounded-sm ring-1 ring-black/10 ${
                        enabled ? "" : "opacity-30"
                      }`}
                      style={{ backgroundColor: STATUS_FILL_COLORS[status] }}
                    />
                    {FILTER_LABELS[status]}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
