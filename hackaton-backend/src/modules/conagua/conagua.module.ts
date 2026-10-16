import { Module } from '@nestjs/common';
import { ConaguaService } from './conagua.service.js';

@Module({
  providers: [ConaguaService],
  exports: [ConaguaService],
})
export class ConaguaModule {}
