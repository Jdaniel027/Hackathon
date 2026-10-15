import { Type } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { validationMessage } from '../../../common/exception/validation-message.js';

export class RegistrarCiclonDto {
  @Type(() => Number)
  @IsNumber({}, { message: validationMessage('INVALID_LAT', 'La latitud debe ser numérica.') })
  @IsLatitude({ message: validationMessage('INVALID_LAT', 'La latitud no es válida.') })
  lat!: number;

  @Type(() => Number)
  @IsNumber({}, { message: validationMessage('INVALID_LNG', 'La longitud debe ser numérica.') })
  @IsLongitude({ message: validationMessage('INVALID_LNG', 'La longitud no es válida.') })
  lng!: number;

  @IsString({ message: validationMessage('INVALID_CATEGORIA', 'categoria debe ser texto.') })
  @IsNotEmpty({ message: validationMessage('INVALID_CATEGORIA', 'categoria es obligatoria.') })
  categoria!: string;

  @Type(() => Number)
  @IsNumber({}, { message: validationMessage('INVALID_VIENTO', 'vientoKmh debe ser numérico.') })
  @Min(0, { message: validationMessage('INVALID_VIENTO', 'vientoKmh no puede ser negativo.') })
  vientoKmh!: number;
}
