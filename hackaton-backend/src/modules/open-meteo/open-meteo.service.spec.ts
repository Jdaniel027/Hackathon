import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenMeteoService } from './open-meteo.service.js';

const CONTEXTO = { latCentro: 23.2494, lngCentro: -106.4111 };

const fetchMock = vi.fn();

function respuestaOk(json: unknown): void {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => json,
  });
}

function respuestaFalla(status: number): void {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error: true, reason: 'no disponible' }),
  });
}

describe('OpenMeteoService', () => {
  const servicio = new OpenMeteoService();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getLluviaZonas', () => {
    it('sin zonas no consulta al proveedor', async () => {
      await expect(servicio.getLluviaZonas([])).resolves.toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('mm1h es la última hora del histórico y mm24h es la suma', async () => {
      // 24 horas: 23 con 0 mm y la última (reciente) con 5 mm.
      const precipitacion = [...Array(23).fill(0), 5];
      respuestaOk([
        {
          latitude: 23.25,
          longitude: -106.41,
          hourly: { precipitation: precipitacion },
        },
      ]);

      const resultado = await servicio.getLluviaZonas([CONTEXTO]);

      expect(resultado).toEqual([
        {
          latCentro: 23.2494,
          lngCentro: -106.4111,
          mm1h: 5,
          mm24h: 5,
          latModelo: 23.25,
          lngModelo: -106.41,
        },
      ]);
    });

    it('acumula todas las horas de la serie para mm24h', async () => {
      respuestaOk([{ hourly: { precipitation: [1, 2, 3, 4] } }]);

      const [lluvia] = await servicio.getLluviaZonas([CONTEXTO]);

      expect(lluvia?.mm1h).toBe(4);
      expect(lluvia?.mm24h).toBe(10);
    });

    it('mantiene el orden de las zonas de entrada', async () => {
      const zonas = [
        { latCentro: 23.2494, lngCentro: -106.4111 },
        { latCentro: 24.8, lngCentro: -107.4 },
      ];
      respuestaOk([
        { latitude: 1, longitude: 1, hourly: { precipitation: [10, 20] } },
        { latitude: 2, longitude: 2, hourly: { precipitation: [1, 2] } },
      ]);

      const resultado = await servicio.getLluviaZonas(zonas);

      expect(resultado.map((z) => z.latCentro)).toEqual([23.2494, 24.8]);
      expect(resultado.map((z) => z.mm24h)).toEqual([30, 3]);
    });

    it('rechaza un punto sin lluvia en lugar de inventar cero', async () => {
      respuestaOk([{ latitude: 23.25, longitude: -106.41 }]);
      await expect(servicio.getLluviaZonas([CONTEXTO])).rejects.toMatchObject({
        status: 503,
      });
    });

    it('usa el modelo y la ventana del proyecto', async () => {
      respuestaOk([{ hourly: { precipitation: [0] } }]);

      await servicio.getLluviaZonas([CONTEXTO]);

      const url = fetchMock.mock.calls[0][0] as URL;
      expect(url.searchParams.get('models')).toBe('ecmwf_ifs');
      expect(url.searchParams.get('hourly')).toBe('precipitation');
      expect(url.searchParams.get('past_hours')).toBe('24');
      expect(url.searchParams.get('forecast_hours')).toBe('1');
    });

    it('suma solo las 24 horas más recientes', async () => {
      respuestaOk([
        { hourly: { precipitation: [100, ...Array(23).fill(0), 3] } },
      ]);
      const [lluvia] = await servicio.getLluviaZonas([CONTEXTO]);
      expect(lluvia?.mm24h).toBe(3);
    });

    it('sin reintentos ante una respuesta 4xx', async () => {
      respuestaFalla(400);

      await expect(servicio.getLluviaZonas([CONTEXTO])).rejects.toMatchObject({
        status: 503,
        response: { code: 'PROVEEDOR_EXTERNO_NO_DISPONIBLE' },
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('ante un 5xx traduce el error del proveedor a 503', async () => {
      respuestaFalla(503);

      await expect(servicio.getLluviaZonas([CONTEXTO])).rejects.toMatchObject({
        status: 503,
        response: { code: 'PROVEEDOR_EXTERNO_NO_DISPONIBLE' },
      });
    });

    it('ante un timeout traduce el aborto a 503', async () => {
      fetchMock.mockRejectedValueOnce(
        Object.assign(new Error('tiempo agotado'), { name: 'AbortError' }),
      );

      await expect(servicio.getLluviaZonas([CONTEXTO])).rejects.toMatchObject({
        status: 503,
        response: { code: 'PROVEEDOR_EXTERNO_NO_DISPONIBLE' },
      });
    });
  });

  describe('getElevaciones', () => {
    it('sin puntos no consulta al proveedor', async () => {
      await expect(servicio.getElevaciones([])).resolves.toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rechaza elevaciones incompletas en lugar de inventar cero', async () => {
      respuestaOk({ elevation: [null] });
      await expect(servicio.getElevaciones([CONTEXTO])).rejects.toMatchObject({
        status: 503,
      });
    });

    it('rechaza con más de 100 coordenadas sin consultar', async () => {
      const puntos = Array.from({ length: 101 }, (_, i) => ({
        latCentro: 23 + i / 1000,
        lngCentro: -106,
      }));

      await expect(servicio.getElevaciones(puntos)).rejects.toMatchObject({
        status: 500,
        response: { code: 'OPEN_METEO_LIMITE' },
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('acepta exactamente 100 coordenadas', async () => {
      const puntos = Array.from({ length: 100 }, (_, i) => ({
        latCentro: 23 + i / 1000,
        lngCentro: -106,
      }));
      respuestaOk({ elevation: puntos.map(() => 7) });

      const resultado = await servicio.getElevaciones(puntos);

      expect(resultado).toHaveLength(100);
      expect(resultado[0]).toBe(7);
    });
  });
});
