import { Module } from '@nestjs/common';
import { UbicacionModule } from '../ubicacion/ubicacion.module.js';
import { ZonasController } from './zonas.controller.js';
import { ZonasService } from './zonas.service.js';

@Module({
  imports: [UbicacionModule],
  controllers: [ZonasController],
  providers: [ZonasService],
  exports: [ZonasService],
})
export class ZonasModule {}
