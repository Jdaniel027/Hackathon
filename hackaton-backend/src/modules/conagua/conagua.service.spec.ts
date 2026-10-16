import { gzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConaguaService } from './conagua.service.js';

const fetchMock = vi.fn();
const fila = (ides: string, idmun: string, nhor: string, prec: string) => ({
  ides,
  idmun,
  nhor,
  prec,
  nmun: 'Mazatlán',
  hloc: '20261016T10',
});

describe('ConaguaService', () => {
  const servicio = new ConaguaService();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('descomprime gzip, filtra municipio y convierte prec sin inventar lecturas', async () => {
    const gzip = gzipSync(
      JSON.stringify([
        fila('25', '12', '0', ' 1.5'),
        fila('25', '12', '1', ' 0.88'),
        fila('25', '12', '2', 'sin dato'),
        fila('20', '58', '0', '100'),
      ]),
    );
    fetchMock.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      arrayBuffer: async () => gzip,
    });

    const resultado = await servicio.getPronosticoPorHora(25, 12);
    expect(resultado.map((r) => r.prec)).toEqual([1.5, 0.88]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('method=3');
  });

  it('descarga una vez aunque se soliciten varios municipios', async () => {
    const gzip = gzipSync(
      JSON.stringify([fila('25', '12', '0', '1'), fila('20', '58', '0', '2')]),
    );
    fetchMock.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      arrayBuffer: async () => gzip,
    });
    const resultado = await servicio.getPronosticosPorHora([
      { idEstadoSmn: 25, idMunSmn: 12 },
      { idEstadoSmn: 20, idMunSmn: 58 },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(resultado.get('25:12')?.[0]?.prec).toBe(1);
    expect(resultado.get('20:58')?.[0]?.prec).toBe(2);
  });

  it('traduce un fallo del proveedor sin persistir datos falsos', async () => {
    fetchMock.mockRejectedValue(new Error('red caída'));
    await expect(servicio.getPronosticoPorHora(25, 12)).rejects.toMatchObject({
      status: 503,
      response: { code: 'PROVEEDOR_EXTERNO_NO_DISPONIBLE' },
    });
  });
});
