import { Module } from '@nestjs/common';
import { CronsService } from './crons.service.js';

@Module({
  providers: [CronsService],
  exports: [CronsService],
})
export class CronsModule {}
