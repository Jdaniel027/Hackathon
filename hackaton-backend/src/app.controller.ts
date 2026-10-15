import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import type { HealthResponse } from './app.service.js';

@ApiTags('salud')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Estado del servicio' })
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }
}
