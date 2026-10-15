import { Type } from 'class-transformer';
import { IsISO8601, IsInt, IsOptional, Min } from 'class-validator';
import { validationMessage } from '../../../common/exception/validation-message.js';

export class ListarReportesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: validationMessage('INVALID_ZONA_ID', 'El zonaId debe ser un entero.') })
  @Min(1, { message: validationMessage('INVALID_ZONA_ID', 'El zonaId debe ser >= 1.') })
  zonaId?: number;

  @IsOptional()
  @IsISO8601(
    {},
    { message: validationMessage('INVALID_DESDE', 'El parámetro "desde" debe ser una fecha ISO 8601.') },
  )
  desde?: string;
}
