import { SetMetadata } from '@nestjs/common';
import { IS_ADMIN_KEY } from '../constants/metadata.constants.js';

// Marca una ruta (o controlador) como administrativa: exige el header x-api-key.
export const Admin = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_ADMIN_KEY, true);
