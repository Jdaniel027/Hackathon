import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UbicacionService } from '../ubicacion/ubicacion.service.js';
import { ZonasService } from './zonas.service.js';

const municipio = { id: 1, slug: 'mazatlan' };
const zonaBase = {
  id: 1,
  latCentro: 23.2494,
  lngCentro: -106.4111,
  ladoM: 9000,
  estado: 'SIN_DATOS',
  mm1h: 0,
  mm24h: 0,
} as const;

describe('ZonasService', () => {
  const buscarMunicipioPorSlug = vi.fn();
  const findManyZonas = vi.fn();
  const findManyRiesgos = vi.fn();
  const findUniqueZona = vi.fn();
  const prisma = {
    zona: { findMany: findManyZonas, findUnique: findUniqueZona },
    zonaRiesgo: { findMany: findManyRiesgos },
  } as unknown as PrismaService;
  const ubicacion = { buscarMunicipioPorSlug } as unknown as UbicacionService;
  const servicio = new ZonasService(prisma, ubicacion);

  beforeEach(() => {
    vi.resetAllMocks();
    buscarMunicipioPorSlug.mockResolvedValue(municipio);
  });

  it('compone el mapa solo con zonas y riesgos activos de la BD', async () => {
    findManyZonas.mockResolvedValue([
      { ...zonaBase, actualizadoEn: new Date('2026-10-15T10:00:00.000Z') },
      { ...zonaBase, id: 2, actualizadoEn: new Date('2026-10-15T12:00:00.000Z') },
    ]);
    findManyRiesgos.mockResolvedValue([{
      id: 7,
      lat: 23.245,
      lng: -106.415,
      radioM: 500,
      motivo: 'ALTURA',
      origen: 'MANUAL',
      venceEn: null,
    }]);

    const mapa = await servicio.getMapa('mazatlan');

    expect(buscarMunicipioPorSlug).toHaveBeenCalledWith('mazatlan');
    expect(findManyZonas).toHaveBeenCalledWith({
      where: { municipioId: 1 },
      orderBy: { id: 'asc' },
    });
    expect(findManyRiesgos).toHaveBeenCalledWith({
      where: { municipioId: 1, activa: true },
      orderBy: { id: 'asc' },
    });
    expect(mapa).toEqual({
      municipio: 'mazatlan',
      actualizadoEn: '2026-10-15T12:00:00.000Z',
      zonas: [zonaBase, { ...zonaBase, id: 2 }],
      zonasRiesgo: [{
        id: 7,
        lat: 23.245,
        lng: -106.415,
        radioM: 500,
        motivo: 'ALTURA',
        origen: 'MANUAL',
        venceEn: null,
      }],
    });
  });

  it('devuelve un mapa vacío para un municipio sin zonas', async () => {
    findManyZonas.mockResolvedValue([]);
    findManyRiesgos.mockResolvedValue([]);
    const antes = Date.now();

    const mapa = await servicio.getMapa('mazatlan');

    expect(mapa.zonas).toEqual([]);
    expect(mapa.zonasRiesgo).toEqual([]);
    expect(Date.parse(mapa.actualizadoEn)).toBeGreaterThanOrEqual(antes);
    expect(Date.parse(mapa.actualizadoEn)).toBeLessThanOrEqual(Date.now());
  });

  it('propaga municipio inexistente sin consultar zonas', async () => {
    buscarMunicipioPorSlug.mockRejectedValue(new Error('No existe el municipio'));

    await expect(servicio.getMapa('inexistente')).rejects.toThrow('No existe el municipio');
    expect(findManyZonas).not.toHaveBeenCalled();
  });

  it('pide las últimas 25 lecturas y convierte sus fechas a ISO', async () => {
    const lecturas = Array.from({ length: 25 }, (_, indice) => ({
      id: 25 - indice,
      mm1h: indice,
      mm24h: indice * 2,
      fuente: 'OPEN_METEO',
      creadoEn: new Date(Date.UTC(2026, 9, 15, 12, -indice)),
    }));
    findUniqueZona.mockResolvedValue({
      ...zonaBase,
      municipio: { slug: 'mazatlan' },
      lecturas,
    });

    const zona = await servicio.getZona(1);

    expect(findUniqueZona).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        municipio: { select: { slug: true } },
        lecturas: { orderBy: { creadoEn: 'desc' }, take: 25 },
      },
    });
    expect(zona.lecturas).toHaveLength(25);
    expect(zona.lecturas[0].id).toBe(25);
    expect(zona.lecturas[0].creadoEn).toBe('2026-10-15T12:00:00.000Z');
    expect(zona.municipioSlug).toBe('mazatlan');
  });

  it('devuelve el error de dominio para una zona inexistente', async () => {
    findUniqueZona.mockResolvedValue(null);

    await expect(servicio.getZona(999)).rejects.toMatchObject({
      response: { code: 'ZONA_NO_ENCONTRADA' },
    });
  });
});
