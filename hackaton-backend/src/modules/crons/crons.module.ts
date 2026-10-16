import { Module } from '@nestjs/common';
import { OpenMeteoModule } from '../open-meteo/open-meteo.module.js';
import { ConaguaModule } from '../conagua/conagua.module.js';
import { CronsService } from './crons.service.js';

@Module({
  imports: [OpenMeteoModule, ConaguaModule],
  providers: [CronsService],
  exports: [CronsService],
})
export class CronsModule {}
