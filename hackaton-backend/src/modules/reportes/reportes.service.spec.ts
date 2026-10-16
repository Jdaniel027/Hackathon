import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { GeminiService } from '../gemini/gemini.service.js';
import type { ZonasService } from '../zonas/zonas.service.js';
import type { CrearReporteDto } from './dto/crear-reporte.dto.js';
import { ReportesService } from './reportes.service.js';

const { parse } = vi.hoisted(() => ({ parse: vi.fn() }));
vi.mock('exifr', () => ({ default: { parse } }));

const ZONA = {
  id: 7,
  municipioId: 2,
  latCentro: 23.2494,
  lngCentro: -106.4111,
  ladoM: 9000,
  modelo: 'ecmwf_ifs',
  latModelo: null,
  lngModelo: null,
  estado: 'NORMAL',
  mm1h: 0,
  mm24h: 0,
  creadoEn: new Date(),
  actualizadoEn: new Date(),
};

function fotoFake(mimetype = 'image/jpeg'): Express.Multer.File {
  return {
    mimetype,
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  } as unknown as Express.Multer.File;
}

function dto(lat = 23.2494, lng = -106.4111): CrearReporteDto {
  return { lat, lng } as CrearReporteDto;
}

function datosCreate(mock: Mock): Record<string, unknown> {
  return mock.mock.calls[0][0].data as Record<string, unknown>;
}

function consultaFindMany(mock: Mock): Record<string, unknown> {
  return mock.mock.calls[0][0] as Record<string, unknown>;
}

describe('ReportesService', () => {
  let buscarZonaPorPunto: Mock;
  let clasificarFoto: Mock;
  let reporteCreate: Mock;
  let reporteFindMany: Mock;
  let reportes: ReportesService;

  beforeEach(() => {
    vi.clearAllMocks();
    buscarZonaPorPunto = vi.fn().mockResolvedValue(ZONA);
    clasificarFoto = vi.fn().mockResolvedValue('INUNDADO');
    reporteCreate = vi.fn().mockResolvedValue({ id: 1 });
    reporteFindMany = vi.fn().mockResolvedValue([]);
    parse.mockReset().mockResolvedValue({ DateTimeOriginal: new Date() });

    const prisma = {
      reporte: { create: reporteCreate, findMany: reporteFindMany },
    } as unknown as PrismaService;

    reportes = new ReportesService(
      prisma,
      { buscarZonaPorPunto } as unknown as ZonasService,
      { clasificarFoto } as unknown as GeminiService,
    );
  });

  describe('crear', () => {
    it('rechaza 415 si no llega archivo', async () => {
      await expect(reportes.crear(undefined, dto())).rejects.toMatchObject({
        status: 415,
        response: { code: 'REPORT_ARCHIVO_INVALIDO' },
      });
      expect(buscarZonaPorPunto).not.toHaveBeenCalled();
    });

    it('rechaza 415 si el MIME no está permitido', async () => {
      await expect(
        reportes.crear(fotoFake('application/pdf'), dto()),
      ).rejects.toMatchObject({
        status: 415,
        response: { code: 'REPORT_ARCHIVO_INVALIDO' },
      });
      expect(buscarZonaPorPunto).not.toHaveBeenCalled();
    });

    it('rechaza un MIME declarado que no coincide con el contenido', async () => {
      const foto = fotoFake();
      foto.buffer = Buffer.from('%PDF-1.4');
      await expect(reportes.crear(foto, dto())).rejects.toMatchObject({
        status: 415,
      });
      expect(clasificarFoto).not.toHaveBeenCalled();
    });

    it('rechaza una foto mayor a 10 MB antes de llamar a Gemini', async () => {
      const foto = fotoFake();
      foto.buffer = Buffer.concat([
        foto.buffer,
        Buffer.alloc(10 * 1024 * 1024),
      ]);
      await expect(reportes.crear(foto, dto())).rejects.toMatchObject({
        status: 413,
      });
      expect(clasificarFoto).not.toHaveBeenCalled();
    });

    it('rechaza 400 si el punto no cae en ninguna zona', async () => {
      buscarZonaPorPunto.mockResolvedValueOnce(null);

      await expect(reportes.crear(fotoFake(), dto())).rejects.toMatchObject({
        status: 400,
        response: { code: 'REPORT_FUERA_DE_ZONA' },
      });
      expect(parse).not.toHaveBeenCalled();
      expect(clasificarFoto).not.toHaveBeenCalled();
      expect(reporteCreate).not.toHaveBeenCalled();
    });

    it('rechaza 400 si la foto tiene más de 30 minutos', async () => {
      parse.mockResolvedValueOnce({
        DateTimeOriginal: new Date(Date.now() - 40 * 60 * 1000),
      });

      await expect(reportes.crear(fotoFake(), dto())).rejects.toMatchObject({
        status: 400,
        response: { code: 'REPORT_FECHA_INVALIDA' },
      });
      expect(clasificarFoto).not.toHaveBeenCalled();
      expect(reporteCreate).not.toHaveBeenCalled();
    });

    it('rechaza fechas EXIF más de 30 minutos en el futuro', async () => {
      parse.mockResolvedValueOnce({
        DateTimeOriginal: new Date(Date.now() + 40 * 60 * 1000),
      });
      await expect(reportes.crear(fotoFake(), dto())).rejects.toMatchObject({
        status: 400,
      });
    });

    it('acepta una foto con EXIF dentro de la ventana de 30 minutos', async () => {
      const reciente = new Date(Date.now() - 10 * 60 * 1000);
      parse.mockResolvedValueOnce({ DateTimeOriginal: reciente });
      reporteCreate.mockResolvedValue({
        id: 1,
        tipo: 'PENDIENTE',
        clasificacion: 'INUNDADO',
        zonaId: 7,
      });

      await expect(reportes.crear(fotoFake(), dto())).resolves.toMatchObject({
        id: 1,
        zonaId: 7,
        tipo: 'PENDIENTE',
        clasificacion: 'INUNDADO',
      });
      expect(datosCreate(reporteCreate).fechaFoto).toBe(reciente);
    });

    it('sin EXIF no inventa fecha y valida contra la hora del servidor', async () => {
      parse.mockResolvedValueOnce(undefined);
      reporteCreate.mockResolvedValue({
        id: 2,
        tipo: 'PENDIENTE',
        clasificacion: 'NORMAL',
      });

      await expect(reportes.crear(fotoFake(), dto())).resolves.toMatchObject({
        id: 2,
      });

      // No se fabrica una fecha: se guarda como desconocida. La validación de
      // antigüedad usa "ahora" como referencia, así que una foto recién subida
      // siempre pasa el filtro de 30 minutos.
      expect(datosCreate(reporteCreate).fechaFoto).toBeNull();
    });

    it('tolera una lectura EXIF corrupta sin dejar de reportar', async () => {
      parse.mockRejectedValueOnce(new Error('exif ilegible'));
      reporteCreate.mockResolvedValue({
        id: 3,
        tipo: 'PENDIENTE',
        clasificacion: 'NORMAL',
      });

      await expect(reportes.crear(fotoFake(), dto())).resolves.toMatchObject({
        id: 3,
      });
      expect(clasificarFoto).toHaveBeenCalled();
    });

    it('persiste en PENDIENTE y traduce la clasificación al enum de la BD', async () => {
      clasificarFoto.mockResolvedValueOnce('PARCIAL');
      reporteCreate.mockResolvedValue({
        id: 4,
        tipo: 'PENDIENTE',
        clasificacion: 'PARCIAL',
        zonaId: 7,
      });

      const respuesta = await reportes.crear(fotoFake(), dto());

      expect(buscarZonaPorPunto).toHaveBeenCalledWith(23.2494, -106.4111);
      expect(clasificarFoto).toHaveBeenCalledWith(
        expect.any(Buffer),
        'image/jpeg',
      );
      // La BD y la API comparten el contrato de clasificación.
      expect(datosCreate(reporteCreate)).toMatchObject({
        zonaId: 7,
        fuente: 'CIUDADANO',
        tipo: 'PENDIENTE',
        clasificacion: 'PARCIAL',
        userLat: 23.2494,
        userLng: -106.4111,
      });
      // Un solo reporte jamás sube a INUNDADO: siempre nace PENDIENTE.
      expect(respuesta).toMatchObject({
        tipo: 'PENDIENTE',
        clasificacion: 'PARCIAL',
      });
    });
  });

  describe('listar', () => {
    beforeEach(() => {
      reporteFindMany.mockResolvedValue([
        {
          id: 1,
          zonaId: 7,
          fuente: 'CIUDADANO',
          tipo: 'CORROBORADO',
          clasificacion: 'PARCIAL',
          userLat: 23.2494,
          userLng: -106.4111,
          fechaFoto: new Date('2026-10-16T08:00:00.000Z'),
          creadoEn: new Date('2026-10-16T08:05:00.000Z'),
        },
        {
          id: 2,
          zonaId: 7,
          fuente: 'CICLON',
          tipo: 'PENDIENTE',
          clasificacion: null,
          userLat: null,
          userLng: null,
          fechaFoto: null,
          creadoEn: new Date('2026-10-16T09:00:00.000Z'),
        },
      ]);
    });

    it('ordena por más reciente y limita a 200 registros', async () => {
      const respuesta = await reportes.listar({} as never);

      expect(consultaFindMany(reporteFindMany)).toMatchObject({
        orderBy: { creadoEn: 'desc' },
        take: 200,
      });
      expect(respuesta.reportes.map((r) => r.id)).toEqual([1, 2]);
    });

    it('filtra por zona y desde con fecha ISO', async () => {
      const desde = '2026-10-16T00:00:00.000Z';

      await reportes.listar({ zonaId: 7, desde } as never);

      const where = consultaFindMany(reporteFindMany).where as {
        zonaId: number;
        creadoEn: { gte: Date };
      };
      expect(where.zonaId).toBe(7);
      expect(where.creadoEn.gte).toBeInstanceOf(Date);
      expect(where.creadoEn.gte.toISOString()).toBe(desde);
    });

    it('sin filtros no agrega condiciones vacías', async () => {
      await reportes.listar({} as never);

      const where = consultaFindMany(reporteFindMany).where as Record<
        string,
        unknown
      >;
      expect(where.zonaId).toBeUndefined();
      expect(where.creadoEn).toBeUndefined();
    });

    it('mantiene la clasificación de la BD y normaliza fechas', async () => {
      const respuesta = await reportes.listar({} as never);

      expect(respuesta.reportes[0]).toMatchObject({
        clasificacion: 'PARCIAL',
        fechaFoto: '2026-10-16T08:00:00.000Z',
        creadoEn: '2026-10-16T08:05:00.000Z',
      });
      expect(respuesta.reportes[1]).toMatchObject({
        clasificacion: null,
        fechaFoto: null,
        lat: null,
        lng: null,
      });
    });
  });
});
