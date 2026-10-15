import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';
import { validationMessage } from '../../../common/exception/validation-message.js';

export class SimularLluviaDto {
  @Type(() => Number)
  @IsInt({ message: validationMessage('INVALID_ZONA_ID', 'El zonaId debe ser un entero.') })
  @Min(1, { message: validationMessage('INVALID_ZONA_ID', 'El zonaId debe ser >= 1.') })
  zonaId!: number;

  @Type(() => Number)
  @IsNumber({}, { message: validationMessage('INVALID_MM', 'mm1h debe ser numérico.') })
  @Min(0, { message: validationMessage('INVALID_MM', 'mm1h no puede ser negativo.') })
  mm1h!: number;

  @Type(() => Number)
  @IsNumber({}, { message: validationMessage('INVALID_MM', 'mm24h debe ser numérico.') })
  @Min(0, { message: validationMessage('INVALID_MM', 'mm24h no puede ser negativo.') })
  mm24h!: number;
}
