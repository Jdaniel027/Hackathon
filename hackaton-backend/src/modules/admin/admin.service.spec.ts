import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OpenMeteoService } from '../open-meteo/open-meteo.service.js';
import type { PuntoZona } from '../open-meteo/open-meteo.service.js';
import { ZonasService } from '../zonas/zonas.service.js';
import { AdminService } from './admin.service.js';

describe('AdminService', () => {
  const findUnique = vi.fn();
  const findMany = vi.fn();
  const createMany = vi.fn();
  const getElevaciones = vi.fn();
  const simularLluvia = vi.fn();
  const generarZonas = vi.fn();
  const prisma = {
    zona: { findUnique },
    zonaRiesgo: { findMany, createMany },
  } as unknown as PrismaService;
  const zonas = { simularLluvia, generarZonas } as unknown as ZonasService;
  const openMeteo = { getElevaciones } as unknown as OpenMeteoService;
  const servicio = new AdminService(prisma, zonas, openMeteo);

  beforeEach(() => {
    vi.resetAllMocks();
    findUnique.mockResolvedValue({
      id: 1,
      municipioId: 4,
      latCentro: 23.2494,
      lngCentro: -106.4111,
      ladoM: 9000,
    });
    findMany.mockResolvedValue([]);
    createMany.mockResolvedValue({ count: 1 });
  });

  it('delega la simulación y la generación a ZonasService', async () => {
    const lluvia = { zonaId: 1, mm1h: 20, mm24h: 50 };
    const caja = {
      municipioSlug: 'mazatlan',
      sw: { lat: 23.2, lng: -106.5 },
      ne: { lat: 23.3, lng: -106.4 },
    };
    simularLluvia.mockResolvedValue({ id: 1 });
    generarZonas.mockResolvedValue({ creadas: 1 });

    await servicio.simularLluvia(lluvia);
    await servicio.generarZonas(caja);

    expect(simularLluvia).toHaveBeenCalledWith(1, 20, 50);
    expect(generarZonas).toHaveBeenCalledWith(
      'mazatlan',
      [23.2, -106.5],
      [23.3, -106.4],
    );
  });

  it('no consulta elevación para una zona inexistente', async () => {
    findUnique.mockResolvedValue(null);
    await expect(servicio.riesgoPorAltura(999)).rejects.toMatchObject({
      response: { code: 'ZONA_NO_ENCONTRADA' },
    });
    expect(getElevaciones).not.toHaveBeenCalled();
  });

  it('rechaza resultados incompletos o no numéricos de Open-Meteo sin escribir', async () => {
    getElevaciones.mockResolvedValueOnce([1, 2]);
    await expect(servicio.riesgoPorAltura(1)).rejects.toMatchObject({
      response: { code: 'PROVEEDOR_EXTERNO_NO_DISPONIBLE' },
    });
    getElevaciones.mockImplementationOnce(async (puntos: PuntoZona[]) =>
      puntos.map(() => Number.NaN),
    );
    await expect(servicio.riesgoPorAltura(1)).rejects.toMatchObject({
      response: { code: 'PROVEEDOR_EXTERNO_NO_DISPONIBLE' },
    });
    expect(createMany).not.toHaveBeenCalled();
  });

  it('no crea riesgos si ningún punto está por debajo de la mediana', async () => {
    getElevaciones.mockImplementation(async (puntos: PuntoZona[]) =>
      puntos.map(() => 10),
    );
    const resultado = await servicio.riesgoPorAltura(1);
    expect(resultado).toMatchObject({
      zonaId: 1,
      puntosEvaluados: 100,
      creados: 0,
    });
    expect(createMany).not.toHaveBeenCalled();
  });

  it('crea un punto bajo la primera vez y evita duplicarlo en otra ejecución', async () => {
    let puntoBajo: PuntoZona | undefined;
    getElevaciones.mockImplementation(async (puntos: PuntoZona[]) => {
      puntoBajo = puntos[0];
      return puntos.map((_, indice) => (indice === 0 ? 5 : 10));
    });

    const primera = await servicio.riesgoPorAltura(1);
    expect(primera.creados).toBe(1);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        municipioId: 4,
        motivo: 'ALTURA',
        origen: 'MANUAL',
        activa: true,
      },
      select: { lat: true, lng: true },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          municipioId: 4,
          lat: puntoBajo?.latCentro,
          lng: puntoBajo?.lngCentro,
          radioM: 500,
          motivo: 'ALTURA',
          origen: 'MANUAL',
        },
      ],
    });

    findMany.mockResolvedValue([
      { lat: puntoBajo?.latCentro, lng: puntoBajo?.lngCentro },
    ]);
    const repetida = await servicio.riesgoPorAltura(1);
    expect(repetida.creados).toBe(0);
    expect(createMany).toHaveBeenCalledTimes(1);
  });

  it('no escribe ciclones mientras V no complete su integración', async () => {
    await expect(
      servicio.registrarCiclon({
        lat: 23.2,
        lng: -106.4,
        categoria: '1',
        vientoKmh: 130,
      }),
    ).rejects.toMatchObject({
      response: { code: 'NO_IMPLEMENTADO' },
      status: 501,
    });
    expect(findUnique).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });
});
