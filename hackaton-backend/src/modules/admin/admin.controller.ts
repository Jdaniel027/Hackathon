import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RATE_LIMITS } from '../../common/constants/rate-limit.constants.js';
import { Admin } from '../../common/decorators/admin.decorator.js';
import { RateLimitEspecifico } from '../../common/decorators/rate-limit.decorator.js';
import { parseZonaIdPipe } from '../../common/pipes/parse-zona-id.pipe.js';
import { CronsService } from '../crons/crons.service.js';
import type { ResultadoCron } from '../crons/crons.service.js';
import type { ZonaMapa } from '../zonas/zonas.types.js';
import { AdminService } from './admin.service.js';
import type {
  RegistrarCiclonResultado,
  RiesgoAlturaResultado,
} from './admin.service.js';
import { GenerarZonasDto } from './dto/generar-zonas.dto.js';
import { RegistrarCiclonDto } from './dto/registrar-ciclon.dto.js';
import { SimularLluviaDto } from './dto/simular-lluvia.dto.js';

@ApiTags('admin')
@ApiHeader({
  name: 'x-api-key',
  required: true,
  description: 'Clave de administración (>= 32 caracteres)',
})
@Admin()
@RateLimitEspecifico(RATE_LIMITS.admin.limit, RATE_LIMITS.admin.ttl)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly crons: CronsService,
  ) {}

  @Post('simular-lluvia')
  @ApiOperation({ summary: 'Fija mm1h/mm24h de una zona (demo)' })
  simularLluvia(@Body() dto: SimularLluviaDto): Promise<ZonaMapa> {
    return this.adminService.simularLluvia(dto);
  }

  @Post('cron/:nombre')
  @ApiOperation({ summary: 'Ejecuta un cron a mano' })
  ejecutarCron(@Param('nombre') nombre: string): Promise<ResultadoCron> {
    return this.crons.ejecutar(nombre);
  }

  @Post('zonas/generar')
  @ApiOperation({
    summary: 'Genera la malla de zonas (cuadros ~9 km) de un municipio',
  })
  generarZonas(@Body() dto: GenerarZonasDto): Promise<{ creadas: number }> {
    return this.adminService.generarZonas(dto);
  }

  @Post('riesgo-altura/:zonaId')
  @ApiOperation({
    summary: 'Marca los puntos bajos de una zona como riesgo ALTURA',
  })
  riesgoAltura(
    @Param('zonaId', parseZonaIdPipe('zonaId')) zonaId: number,
  ): Promise<RiesgoAlturaResultado> {
    return this.adminService.riesgoPorAltura(zonaId);
  }

  @Post('ciclon')
  @ApiOperation({
    summary: 'Registra un riesgo de ciclón manual para la demo',
  })
  registrarCiclon(
    @Body() dto: RegistrarCiclonDto,
  ): Promise<RegistrarCiclonResultado> {
    return this.adminService.registrarCiclon(dto);
  }
}
