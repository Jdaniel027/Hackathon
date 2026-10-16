import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module.js';
import { ZonasModule } from '../zonas/zonas.module.js';
import { ReportesController } from './reportes.controller.js';
import { ReportesService } from './reportes.service.js';

@Module({
  imports: [ZonasModule, GeminiModule],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
