import { describe, expect, it } from 'vitest';
import { AppService } from './app.service.js';

describe('GET /health: respuesta del servicio', () => {
  it('indica estado ok con fecha ISO', () => {
    const respuesta = new AppService().getHealth();

    expect(respuesta.status).toBe('ok');
    expect(new Date(respuesta.timestamp).toISOString()).toBe(respuesta.timestamp);
  });
});
