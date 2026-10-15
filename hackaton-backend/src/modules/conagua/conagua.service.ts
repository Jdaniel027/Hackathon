import { Injectable } from '@nestjs/common';
import { APP_ERRORS } from '../../common/exception/app-exception.js';

export interface PronosticoMunicipio {
  ides: number;
  idmun: number;
  nmun: string;
  prec: number;
  hloc: string;
}

// Cliente del web service de Conagua/SMN.
// SOLO lo usan los crons y /admin; nunca los endpoints de lectura.
@Injectable()
export class ConaguaService {
  // TODO(DEVELOPER_V): confirmar el host completo del web service, descomprimir la
  // respuesta (gunzip) y filtrar por ides/idmun. Ver API_MANUAL.md §3.1.
  async getPronosticoPorHora(
    _idEstadoSmn: number,
    _idMunSmn: number,
  ): Promise<PronosticoMunicipio[]> {
    throw APP_ERRORS.NO_IMPLEMENTADO(
      'El cliente de Conagua aún no está implementado (DEVELOPER_V, Fase 4).',
    );
  }
}
