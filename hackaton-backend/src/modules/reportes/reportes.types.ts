import type { ClasificacionFoto } from '../gemini/gemini.service.js';

export type TipoReporteApi = 'CORROBORADO' | 'PENDIENTE' | 'NO_CORROBORADO';
export type ClasificacionIAApi = ClasificacionFoto;
export type FuenteReporteApi = 'CIUDADANO' | 'CICLON';

export interface ReporteCreadoResponse {
  id: number;
  zonaId: number;
  tipo: TipoReporteApi;
  clasificacion: ClasificacionIAApi | null;
}

export interface ReporteApi {
  id: number;
  zonaId: number;
  fuente: FuenteReporteApi;
  tipo: TipoReporteApi;
  clasificacion: ClasificacionIAApi | null;
  lat: number | null;
  lng: number | null;
  fechaFoto: string | null;
  creadoEn: string;
}

export interface ListarReportesResponse {
  reportes: ReporteApi[];
}
