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
  ReporteCreadoResponse,
  FuenteReporteApi,
  TipoReporteApi,
} from './reportes.types.js';
import exifr from 'exifr';
import { MAX_FOTO_BYTES, mimeRealFoto } from './utils/validar-foto.util.js';

const MAX_REPORTES = 200;
const MAX_ANTIGUEDAD_FOTO_MS = 30 * 60 * 1000; // 30 minutos

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zonas: ZonasService,
    private readonly gemini: GeminiService,
  ) {}

  private async extraerFechaFoto(buffer: Buffer): Promise<Date | null> {
    try {
      const meta = await exifr.parse(buffer, { pick: ['DateTimeOriginal'] });
      const fechaExif = meta?.DateTimeOriginal;
      if (fechaExif instanceof Date && !isNaN(fechaExif.getTime())) {
        return fechaExif;
      }
    } catch {
      this.logger.warn('No se pudo leer EXIF de la foto.');
    }
    return null;
  }

  private validarAntiguedadFoto(fechaFoto: Date | null): void {
    const ahora = new Date();
    const referencia = fechaFoto ?? ahora;
    const diffMs = ahora.getTime() - referencia.getTime();
    if (Math.abs(diffMs) > MAX_ANTIGUEDAD_FOTO_MS) {
      throw APP_ERRORS.REPORT_FECHA_INVALIDA();
    }
  }

  async crear(
    foto: Express.Multer.File | undefined,
    dto: CrearReporteDto,
  ): Promise<ReporteCreadoResponse> {
    if (
      !foto ||
      !MIME_PERMITIDOS.includes(foto.mimetype) ||
      !Buffer.isBuffer(foto.buffer) ||
      mimeRealFoto(foto.buffer) !== foto.mimetype
    ) {
      throw APP_ERRORS.REPORT_ARCHIVO_INVALIDO();
    }
    if (foto.buffer.length > MAX_FOTO_BYTES)
      throw APP_ERRORS.REPORT_ARCHIVO_MUY_GRANDE();

    const zona: Zona | null = await this.zonas.buscarZonaPorPunto(
      dto.lat,
      dto.lng,
    );
    if (!zona) {
      throw APP_ERRORS.REPORT_FUERA_DE_ZONA();
    }

    // Leer EXIF (fecha/orientación) y validar antigüedad ≤ 30 min
    const fechaFoto = await this.extraerFechaFoto(foto.buffer);
    this.validarAntiguedadFoto(fechaFoto);

    const clasificacion = await this.gemini.clasificarFoto(
      foto.buffer,
      foto.mimetype,
    );

    const reporte = await this.prisma.reporte.create({
      data: {
        zonaId: zona.id,
        fuente: 'CIUDADANO',
        tipo: 'PENDIENTE',
        clasificacion,
        userLat: dto.lat,
        userLng: dto.lng,
        fechaFoto,
      },
    });

    this.logger.log(
      `Reporte ${reporte.id} en zona ${zona.id} clasificado como ${clasificacion}.`,
    );

    return {
      id: reporte.id,
      zonaId: reporte.zonaId,
      tipo: reporte.tipo as TipoReporteApi,
      clasificacion,
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
        clasificacion: reporte.clasificacion,
        lat: reporte.userLat,
        lng: reporte.userLng,
        fechaFoto: reporte.fechaFoto ? reporte.fechaFoto.toISOString() : null,
        creadoEn: reporte.creadoEn.toISOString(),
      })),
    };
  }
}
