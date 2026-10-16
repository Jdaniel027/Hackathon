import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNumber } from 'class-validator';
import { validationMessage } from '../../../common/exception/validation-message.js';

export class CrearReporteDto {
  @Type(() => Number)
  @IsNumber({}, { message: validationMessage('INVALID_LAT', 'La latitud debe ser numérica.') })
  @IsLatitude({ message: validationMessage('INVALID_LAT', 'La latitud no es válida.') })
  lat!: number;

  @Type(() => Number)
  @IsNumber({}, { message: validationMessage('INVALID_LNG', 'La longitud debe ser numérica.') })
  @IsLongitude({ message: validationMessage('INVALID_LNG', 'La longitud no es válida.') })
  lng!: number;
}
