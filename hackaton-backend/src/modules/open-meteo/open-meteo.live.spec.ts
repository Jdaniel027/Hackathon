import { describe, expect, it } from 'vitest';
import { OpenMeteoService } from './open-meteo.service.js';

// Prueba de humo contra el proveedor real. No corre por defecto para que la
// suite sea determinista y sin red; se activa con RUN_LIVE=1.
const CORRER = /^(1|true|si|sí)$/i.test(process.env.RUN_LIVE ?? '');

const MAZATLAN = { latCentro: 23.2494, lngCentro: -106.4111 };

describe.skipIf(!CORRER)('OpenMeteoService contra la API real (RUN_LIVE=1)', () => {
  const servicio = new OpenMeteoService();

  it(
    'devuelve precipitación real y coherente para Mazatlán',
    async () => {
      const [lluvia] = await servicio.getLluviaZonas([MAZATLAN]);

      expect(lluvia).toBeDefined();
      expect(Number.isFinite(lluvia?.mm1h)).toBe(true);
      expect(Number.isFinite(lluvia?.mm24h)).toBe(true);
      expect(lluvia?.mm1h).toBeGreaterThanOrEqual(0);
      // El acumulado de 24 h incluye la última hora.
      expect(lluvia?.mm24h).toBeGreaterThanOrEqual(lluvia?.mm1h ?? 0);
      // Open-Meteo devuelve la rejilla del modelo, no exactamente el punto.
      expect(Math.abs((lluvia?.latModelo ?? 0) - MAZATLAN.latCentro)).toBeLessThan(1);
      expect(Math.abs((lluvia?.lngModelo ?? 0) - MAZATLAN.lngCentro)).toBeLessThan(1);
    },
    20_000,
  );

  it(
    'devuelve la elevación real del punto',
    async () => {
      const [elevacion] = await servicio.getElevaciones([MAZATLAN]);

      expect(typeof elevacion).toBe('number');
      expect(Number.isFinite(elevacion)).toBe(true);
      expect(elevacion).toBeGreaterThan(-500);
      expect(elevacion).toBeLessThan(8000);
    },
    20_000,
  );
});
