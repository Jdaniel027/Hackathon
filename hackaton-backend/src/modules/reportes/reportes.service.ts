import { Injectable, Logger } from '@nestjs/common';
import type { Zona } from '../../generated/prisma/client.js';
import { APP_ERRORS } from '../../common/exception/app-exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { GeminiService, MIME_PERMITIDOS } from '../gemini/gemini.service.js';
import { ZonasService } from '../zonas/zonas.service.js';
import type { CrearReporteDto } from './dto/crear-reporte.dto.js';
import type { ListarReportesQueryDto } from './dto/listar-reportes-query.dto.js';
import type {
  ListarReportesResponse,
  ReporteApi,
  ReporteCreadoResponse,
  ClasificacionIAApi,
  FuenteReporteApi,
  TipoReporteApi,
} from './reportes.types.js';

const MAX_REPORTES = 200;

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zonas: ZonasService,
    private readonly gemini: GeminiService,
  ) {}

  async crear(
    foto: Express.Multer.File | undefined,
    dto: CrearReporteDto,
  ): Promise<ReporteCreadoResponse> {
    if (!foto || !MIME_PERMITIDOS.includes(foto.mimetype)) {
      throw APP_ERRORS.REPORT_ARCHIVO_INVALIDO();
    }

    const zona: Zona | null = await this.zonas.buscarZonaPorPunto(dto.lat, dto.lng);
    if (!zona) {
      throw APP_ERRORS.REPORT_FUERA_DE_ZONA();
    }

    // TODO(DEVELOPER_V): leer EXIF (fecha/orientación) con `exifr` y rechazar fotos
    // con más de 30 minutos de antigüedad (APP_ERRORS.REPORT_FECHA_INVALIDA).
    const clasificacion = await this.gemini.clasificarFoto(foto.buffer, foto.mimetype);

    const reporte = await this.prisma.reporte.create({
      data: {
        zonaId: zona.id,
        fuente: 'CIUDADANO',
        tipo: 'PENDIENTE',
        clasificacion,
        userLat: dto.lat,
        userLng: dto.lng,
      },
    });

    this.logger.log(
      `Reporte ${reporte.id} en zona ${zona.id} clasificado como ${clasificacion}.`,
    );

    return {
      id: reporte.id,
      zonaId: reporte.zonaId,
      tipo: reporte.tipo as TipoReporteApi,
      clasificacion: reporte.clasificacion as ClasificacionIAApi | null,
    };
  }

  async listar(query: ListarReportesQueryDto): Promise<ListarReportesResponse> {
    const reportes = await this.prisma.reporte.findMany({
      where: {
        zonaId: query.zonaId,
        creadoEn: query.desde ? { gte: new Date(query.desde) } : undefined,
      },
      orderBy: { creadoEn: 'desc' },
      take: MAX_REPORTES,
    });

    return {
      reportes: reportes.map((reporte) => ({
        id: reporte.id,
        zonaId: reporte.zonaId,
        fuente: reporte.fuente as FuenteReporteApi,
        tipo: reporte.tipo as TipoReporteApi,
        clasificacion: reporte.clasificacion as ClasificacionIAApi | null,
        userLat: reporte.userLat,
        userLng: reporte.userLng,
        fechaFoto: reporte.fechaFoto ? reporte.fechaFoto.toISOString() : null,
        creadoEn: reporte.creadoEn.toISOString(),
      })),
    };
  }
}
