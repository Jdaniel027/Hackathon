import type {
  FloodSeverity,
  ReportVerificationStatus,
} from "../types/report";
import {
  EMPTY_REPORT_FILTERS,
  isFilterActive,
  type ReportFilters,
} from "../lib/filterReports";
import { SEVERITY_LABELS, VERIFICATION_LABELS } from "../lib/reportLabels";

const SEVERITY_OPTIONS: FloodSeverity[] = ["low", "medium", "high"];
const STATUS_OPTIONS: ReportVerificationStatus[] = [
  "pending",
  "verified",
  "rejected",
];

interface ReportFiltersPanelProps {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
  resultCount: number;
}

/**
 * Controles temporales para probar el filtrado. La lógica de filtrado vive en
 * `lib/filterReports.ts` y es independiente de esta presentación, de modo que
 * estos controles puedan reemplazarse por el diseño de Figma.
 */
export default function ReportFiltersPanel({
  filters,
  onChange,
  resultCount,
}: ReportFiltersPanelProps) {
  const toggleSeverity = (value: FloodSeverity) => {
    const severities = filters.severities.includes(value)
      ? filters.severities.filter((item) => item !== value)
      : [...filters.severities, value];
    onChange({ ...filters, severities });
  };

  const toggleStatus = (value: ReportVerificationStatus) => {
    const verificationStatuses = filters.verificationStatuses.includes(value)
      ? filters.verificationStatuses.filter((item) => item !== value)
      : [...filters.verificationStatuses, value];
    onChange({ ...filters, verificationStatuses });
  };

  return (
    <section
      aria-label="Filtros de reportes"
      className="pointer-events-auto absolute bottom-3 left-3 z-10 w-52 rounded-md bg-white/95 p-2 text-[11px] text-slate-700 shadow ring-1 ring-slate-200"
    >
      <h2 className="mb-1 font-semibold text-slate-900">Filtros de reportes</h2>

      <fieldset className="mb-1">
        <legend className="text-[10px] uppercase tracking-wide text-slate-400">
          Severidad
        </legend>
        {SEVERITY_OPTIONS.map((value) => (
          <label key={value} className="flex min-h-6 items-center gap-2">
            <input
              type="checkbox"
              checked={filters.severities.includes(value)}
              onChange={() => toggleSeverity(value)}
            />
            {SEVERITY_LABELS[value]}
          </label>
        ))}
      </fieldset>

      <fieldset className="mb-1">
        <legend className="text-[10px] uppercase tracking-wide text-slate-400">
          Verificación
        </legend>
        {STATUS_OPTIONS.map((value) => (
          <label key={value} className="flex min-h-6 items-center gap-2">
            <input
              type="checkbox"
              checked={filters.verificationStatuses.includes(value)}
              onChange={() => toggleStatus(value)}
            />
            {VERIFICATION_LABELS[value]}
          </label>
        ))}
      </fieldset>

      <div className="flex items-center justify-between gap-2">
        <span role="status" className="text-slate-500">
          {resultCount} reporte{resultCount === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={() => onChange(EMPTY_REPORT_FILTERS)}
          disabled={!isFilterActive(filters)}
          className="rounded border border-slate-300 px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Restablecer
        </button>
      </div>

      {resultCount === 0 && (
        <p role="status" className="mt-1 text-[10px] leading-tight text-amber-700">
          No hay reportes con los filtros actuales.
        </p>
      )}

      <p className="mt-1 text-[10px] leading-tight text-slate-400">
        Reportes de demostración — datos simulados.
      </p>
    </section>
  );
}
