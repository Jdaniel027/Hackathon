import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { APP_ERRORS } from '../../common/exception/app-exception.js';

export const NOMBRES_CRON = [
  'actualizarClima',
  'reevaluarReportes',
  'expirarRiesgos',
  'revisarCiclones',
] as const;

export type NombreCron = (typeof NOMBRES_CRON)[number];

export interface ResultadoCron {
  nombre: string;
  ejecutado: boolean;
  nota: string;
}

@Injectable()
export class CronsService {
  private readonly logger = new Logger(CronsService.name);

  // Cada 15 minutos: Open-Meteo → Zona + LecturaClima.
  @Cron('0 */15 * * * *')
  async actualizarClima(): Promise<void> {
    await this.ejecutar('actualizarClima');
  }

  // Cada 10 minutos: recalcula CORROBORADO/PENDIENTE/NO_CORROBORADO.
  @Cron('0 */10 * * * *')
  async reevaluarReportes(): Promise<void> {
    await this.ejecutar('reevaluarReportes');
  }

  // Cada hora: desactiva ZonaRiesgo vencidas.
  @Cron('0 0 * * * *')
  async expirarRiesgos(): Promise<void> {
    await this.ejecutar('expirarRiesgos');
  }

  // Cada 3 horas: revisa ciclones.
  @Cron('0 0 */3 * * *')
  async revisarCiclones(): Promise<void> {
    await this.ejecutar('revisarCiclones');
  }

  // Permite disparar un cron a mano desde /admin/cron/:nombre.
  async ejecutar(nombre: string): Promise<ResultadoCron> {
    if (!this.esNombreValido(nombre)) {
      throw APP_ERRORS.CRON_DESCONOCIDO(nombre);
    }
    // TODO(DEVELOPER_V): implementar cada job (Open-Meteo, Conagua, reevaluación...).
    this.logger.warn(
      `Cron "${nombre}" invocado: pendiente de implementación (DEVELOPER_V).`,
    );
    return {
      nombre,
      ejecutado: false,
      nota: 'Pendiente de implementación (DEVELOPER_V).',
    };
  }

  private esNombreValido(nombre: string): nombre is NombreCron {
    return (NOMBRES_CRON as readonly string[]).includes(nombre);
  }
}
