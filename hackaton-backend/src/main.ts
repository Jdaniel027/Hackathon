import './config/load-env.js';

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configurarApp } from './bootstrap/configurar-app.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Detrás de un reverse proxy (Cloudflare, nginx...), confiar en el primer proxy
  // para que el rate limit vea la IP real del visitante y no la del proxy.
  app.set('trust proxy', 1);

  const config = app.get(ConfigService);
  configurarApp(app, config);

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);

  Logger.log(`AquaReport backend escuchando en http://localhost:${port}/api/v1`, 'Bootstrap');
  Logger.log(`Swagger en http://localhost:${port}/api/v1/docs`, 'Bootstrap');
}

await bootstrap();
