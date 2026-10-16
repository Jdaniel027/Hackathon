import { describe, expect, it } from 'vitest';
import { ConaguaService } from './conagua.service.js';

describe('ConaguaService (stub pendiente de Fase 4)', () => {
  const servicio = new ConaguaService();

  it('responde 501 NO_IMPLEMENTADO en lugar de inventar datos', async () => {
    await expect(servicio.getPronosticoPorHora(25, 12)).rejects.toMatchObject({
      status: 501,
      response: { code: 'NO_IMPLEMENTADO' },
    });
  });

  it('documenta la firma que usará el cron de apoyo', () => {
    // El contrato público se mantiene mientras se implementa el cliente real.
    expect(typeof servicio.getPronosticoPorHora).toBe('function');
  });
});
