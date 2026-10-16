import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UbicacionService } from '../ubicacion/ubicacion.service.js';
import { ZonasService } from './zonas.service.js';

describe('operaciones de escritura de ZonasService para admin', () => {
  const buscarMunicipioPorSlug = vi.fn();
  const findUnique = vi.fn();
  const createMany = vi.fn();
  const crearLectura = vi.fn();
  const actualizarZona = vi.fn();
  const transaction = vi.fn();
  const prisma = {
    zona: { findUnique, createMany },
    $transaction: transaction,
  } as unknown as PrismaService;
  const ubicacion = { buscarMunicipioPorSlug } as unknown as UbicacionService;
  const servicio = new ZonasService(prisma, ubicacion);

  beforeEach(() => {
    vi.resetAllMocks();
    buscarMunicipioPorSlug.mockResolvedValue({ id: 1, slug: 'mazatlan' });
    findUnique.mockResolvedValue({ id: 1, municipio: { slug: 'mazatlan' } });
    crearLectura.mockResolvedValue({ id: 10 });
    actualizarZona.mockImplementation(async ({ data }) => ({
      id: 1,
      latCentro: 23.2494,
      lngCentro: -106.4111,
      ladoM: 9000,
      ...data,
    }));
    transaction.mockImplementation(async (callback) =>
      callback({
        lecturaClima: { create: crearLectura },
        zona: { update: actualizarZona },
      }),
    );
  });

  it.each([
    [0, 0, 'NORMAL'],
    [20, 0, 'PRECAUCION'],
    [40, 0, 'INUNDADO'],
  ])(
    'guarda la lectura y el estado de %s mm1h en una transacción',
    async (mm1h, mm24h, estado) => {
      const zona = await servicio.simularLluvia(1, mm1h, mm24h);

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(crearLectura).toHaveBeenCalledWith({
        data: { zonaId: 1, mm1h, mm24h, fuente: 'OPEN_METEO' },
      });
      expect(actualizarZona).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { mm1h, mm24h, estado },
      });
      expect(zona.estado).toBe(estado);
    },
  );

  it('no escribe lluvia en una zona inexistente', async () => {
    findUnique.mockResolvedValue(null);
    await expect(servicio.simularLluvia(999, 10, 20)).rejects.toMatchObject({
      response: { code: 'ZONA_NO_ENCONTRADA' },
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rechaza límites invertidos antes de consultar o escribir', async () => {
    await expect(
      servicio.generarZonas('mazatlan', [23.5, -106.4], [23.4, -106.3]),
    ).rejects.toMatchObject({ status: 400 });
    expect(buscarMunicipioPorSlug).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it('rechaza una malla de más de 500 celdas antes de construirla', async () => {
    await expect(
      servicio.generarZonas('mazatlan', [22, -107], [25, -104]),
    ).rejects.toMatchObject({ status: 400 });
    expect(buscarMunicipioPorSlug).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it('genera la malla pequeña con skipDuplicates para repetir la operación', async () => {
    createMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const primera = await servicio.generarZonas(
      'mazatlan',
      [23.2, -106.5],
      [23.3, -106.4],
    );
    const repetida = await servicio.generarZonas(
      'mazatlan',
      [23.2, -106.5],
      [23.3, -106.4],
    );

    expect(primera).toEqual({ creadas: 1 });
    expect(repetida).toEqual({ creadas: 0 });
    expect(createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ municipioId: 1, ladoM: 9000 }),
      ]),
      skipDuplicates: true,
    });
  });

  it('rechaza un municipio inexistente sin generar zonas', async () => {
    buscarMunicipioPorSlug.mockRejectedValue(
      new Error('Municipio no encontrado'),
    );
    await expect(
      servicio.generarZonas('noexiste', [23.2, -106.5], [23.3, -106.4]),
    ).rejects.toThrow('Municipio no encontrado');
    expect(createMany).not.toHaveBeenCalled();
  });
});
