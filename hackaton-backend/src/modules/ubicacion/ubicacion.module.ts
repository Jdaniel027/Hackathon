import { Module } from '@nestjs/common';
import { UbicacionService } from './ubicacion.service.js';

@Module({
  providers: [UbicacionService],
  exports: [UbicacionService],
})
export class UbicacionModule {}
