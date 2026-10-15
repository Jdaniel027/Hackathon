import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppGlobalFilter } from '../common/filter/app-global.filter.js';
import { BigIntSerializeInterceptor } from '../common/interceptors/big-int-serialize.interceptor.js';
import { requestIdMiddleware } from '../common/middleware/request-id.middleware.js';
import { AppValidationPipe } from '../common/pipes/app-validation.pipe.js';

// Configuración global de la app: prefijo, seguridad, validación, errores y Swagger.
export function configurarApp(
  app: NestExpressApplication,
  config: ConfigService,
): void {
  const origenes = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origen) => origen.trim())
    .filter((origen) => origen.length > 0);

  // Express no confía en X-Forwarded-For salvo que se configure el número real
  // de proxies de confianza delante de la aplicación.
  app.set('trust proxy', config.get<number>('TRUST_PROXY_HOPS') ?? 0);

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(requestIdMiddleware);
  app.enableCors({
    origin: origenes.length > 0 ? origenes : false,
    credentials: false,
  });
  app.useGlobalPipes(new AppValidationPipe());
  app.useGlobalFilters(new AppGlobalFilter());
  app.useGlobalInterceptors(new BigIntSerializeInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AquaReport API')
    .setDescription(
      'Alertas de inundación: zonas, reportes ciudadanos y administración. La API pública es anónima; /admin/* requiere x-api-key.',
    )
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'admin-key')
    .build();

  const documento = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, documento);
}
