import { Module } from '@nestjs/common';
import { CronsModule } from '../crons/crons.module.js';
import { OpenMeteoModule } from '../open-meteo/open-meteo.module.js';
import { ZonasModule } from '../zonas/zonas.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [ZonasModule, CronsModule, OpenMeteoModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
