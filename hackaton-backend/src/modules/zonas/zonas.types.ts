export type EstadoZonaApi = 'SIN_DATOS' | 'NORMAL' | 'PRECAUCION' | 'INUNDADO';
export type MotivoRiesgoApi = 'ALTURA' | 'INUNDACION';
export type OrigenRiesgoApi = 'MANUAL' | 'CICLON' | 'CLIMA';
export type FuenteClimaApi = 'CONAGUA' | 'OPEN_METEO';

export interface ZonaMapa {
  id: number;
  latCentro: number;
  lngCentro: number;
  ladoM: number;
  estado: EstadoZonaApi;
  mm1h: number;
  mm24h: number;
}

export interface ZonaRiesgoMapa {
  id: number;
  lat: number;
  lng: number;
  radioM: number;
  motivo: MotivoRiesgoApi;
  origen: OrigenRiesgoApi;
  venceEn: string | null;
}

export interface MapaResponse {
  municipio: string;
  actualizadoEn: string;
  zonas: ZonaMapa[];
  zonasRiesgo: ZonaRiesgoMapa[];
}

export interface LecturaClimaApi {
  id: number;
  mm1h: number;
  mm24h: number;
  fuente: FuenteClimaApi;
  creadoEn: string;
}

export interface ZonaDetalle extends ZonaMapa {
  municipioSlug: string;
  lecturas: LecturaClimaApi[];
}
