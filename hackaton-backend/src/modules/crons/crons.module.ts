import { Module } from '@nestjs/common';
import { OpenMeteoModule } from '../open-meteo/open-meteo.module.js';
import { CronsService } from './crons.service.js';

@Module({
  imports: [OpenMeteoModule],
  providers: [CronsService],
  exports: [CronsService],
})
export class CronsModule {}
