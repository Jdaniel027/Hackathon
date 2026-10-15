import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { RATE_LIMITS } from './common/constants/rate-limit.constants.js';
import { ApiKeyGuard } from './common/guards/api-key.guard.js';
import { validateEnv } from './config/env.schema.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { ConaguaModule } from './modules/conagua/conagua.module.js';
import { CronsModule } from './modules/crons/crons.module.js';
import { GeminiModule } from './modules/gemini/gemini.module.js';
import { OpenMeteoModule } from './modules/open-meteo/open-meteo.module.js';
import { ReportesModule } from './modules/reportes/reportes.module.js';
import { UbicacionModule } from './modules/ubicacion/ubicacion.module.js';
import { ZonasModule } from './modules/zonas/zonas.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: RATE_LIMITS.global.ttl,
        limit: RATE_LIMITS.global.limit,
      },
    ]),
    PrismaModule,
    UbicacionModule,
    ZonasModule,
    ReportesModule,
    OpenMeteoModule,
    ConaguaModule,
    GeminiModule,
    CronsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Orden de guards: throttler → api key.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: ApiKeyGuard },
  ],
})
export class AppModule {}
