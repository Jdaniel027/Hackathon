import type {
  FloodReport,
  FloodSeverity,
  ReportVerificationStatus,
} from "../types/report";

/**
 * Filtros de reportes. Un arreglo vacío significa "sin restricción".
 */
export interface ReportFilters {
  severities: FloodSeverity[];
  verificationStatuses: ReportVerificationStatus[];
}

export const EMPTY_REPORT_FILTERS: ReportFilters = {
  severities: [],
  verificationStatuses: [],
};

export function isFilterActive(filters: ReportFilters): boolean {
  return (
    filters.severities.length > 0 || filters.verificationStatuses.length > 0
  );
}

/**
 * Devuelve una nueva colección filtrada. Función pura: no muta la entrada.
 * Un reporte sin `verificationStatus` solo pasa el filtro de verificación
 * cuando no se filtra por estado.
 */
export function filterReports(
  reports: FloodReport[],
  filters: ReportFilters,
): FloodReport[] {
  return reports.filter((report) => {
    const severityOk =
      filters.severities.length === 0 ||
      filters.severities.includes(report.severity);

    const statusOk =
      filters.verificationStatuses.length === 0 ||
      (report.verificationStatus !== undefined &&
        filters.verificationStatuses.includes(report.verificationStatus));

    return severityOk && statusOk;
  });
}
