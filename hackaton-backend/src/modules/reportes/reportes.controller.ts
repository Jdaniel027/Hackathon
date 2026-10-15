import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RATE_LIMITS } from '../../common/constants/rate-limit.constants.js';
import { RateLimitEspecifico } from '../../common/decorators/rate-limit.decorator.js';
import { CrearReporteDto } from './dto/crear-reporte.dto.js';
import { ListarReportesQueryDto } from './dto/listar-reportes-query.dto.js';
import { ReportesService } from './reportes.service.js';
import type { ListarReportesResponse, ReporteCreadoResponse } from './reportes.types.js';

@ApiTags('reportes')
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Post()
  @RateLimitEspecifico(RATE_LIMITS.reportes.limit, RATE_LIMITS.reportes.ttl)
  @UseInterceptors(FileInterceptor('foto'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Crea un reporte ciudadano con foto (2 cada 15 min por IP)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        foto: { type: 'string', format: 'binary' },
        lat: { type: 'number', example: 23.2494 },
        lng: { type: 'number', example: -106.4111 },
      },
      required: ['foto', 'lat', 'lng'],
    },
  })
  crear(
    @UploadedFile() foto: Express.Multer.File | undefined,
    @Body() dto: CrearReporteDto,
  ): Promise<ReporteCreadoResponse> {
    return this.reportesService.crear(foto, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista los reportes más recientes' })
  listar(@Query() query: ListarReportesQueryDto): Promise<ListarReportesResponse> {
    return this.reportesService.listar(query);
  }
}
