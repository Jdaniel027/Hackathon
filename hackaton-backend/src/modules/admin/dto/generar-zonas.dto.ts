import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { validationMessage } from '../../../common/exception/validation-message.js';
import { CoordenadaDto } from './coordenada.dto.js';

export class GenerarZonasDto {
  @IsString({ message: validationMessage('INVALID_SLUG', 'municipioSlug debe ser texto.') })
  @IsNotEmpty({ message: validationMessage('INVALID_SLUG', 'municipioSlug es obligatorio.') })
  municipioSlug!: string;

  @ValidateNested()
  @Type(() => CoordenadaDto)
  sw!: CoordenadaDto;

  @ValidateNested()
  @Type(() => CoordenadaDto)
  ne!: CoordenadaDto;
}
