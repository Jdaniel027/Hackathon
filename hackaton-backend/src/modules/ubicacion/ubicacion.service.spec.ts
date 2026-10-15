import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UbicacionService } from './ubicacion.service.js';

describe('UbicacionService', () => {
  it('busca el municipio por slug', async () => {
    const municipio = { id: 1, slug: 'mazatlan' };
    const findUnique = vi.fn().mockResolvedValue(municipio);
    const prisma = { municipio: { findUnique } } as unknown as PrismaService;
    const servicio = new UbicacionService(prisma);

    await expect(servicio.buscarMunicipioPorSlug('mazatlan')).resolves.toBe(
      municipio,
    );
    expect(findUnique).toHaveBeenCalledWith({ where: { slug: 'mazatlan' } });
  });

  it('devuelve el error de dominio si no existe el municipio', async () => {
    const prisma = {
      municipio: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const servicio = new UbicacionService(prisma);

    await expect(servicio.buscarMunicipioPorSlug('desconocido')).rejects.toMatchObject({
      response: { code: 'MUNICIPIO_NO_ENCONTRADO' },
    });
  });
});
