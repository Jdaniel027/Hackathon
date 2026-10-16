import { afterEach, describe, expect, it, vi } from "vitest";

import { API_BASE_URL, ApiError } from "./apiClient";
import { fetchMapa } from "./mapaService";

/** Sustituye `fetch` por un doble simple (evita depender de `Response`). */
function stubFetch(response: {
  ok: boolean;
  status: number;
  statusText?: string;
  body?: unknown;
}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    statusText: response.statusText ?? "",
    json: () => Promise.resolve(response.body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("fetchMapa", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("consulta /mapa/:municipioSlug y devuelve el cuerpo", async () => {
    const body = {
      municipio: "mazatlan",
      actualizadoEn: "2026-10-16T00:00:00.000Z",
      zonas: [],
      zonasRiesgo: [],
    };
    const fetchMock = stubFetch({ ok: true, status: 200, body });

    const mapa = await fetchMapa("mazatlan");

    expect(mapa).toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/mapa/mazatlan`,
      expect.anything(),
    );
  });

  it("codifica el slug en la URL", async () => {
    const fetchMock = stubFetch({ ok: true, status: 200, body: {} });

    await fetchMapa("san blas");

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/mapa/san%20blas`,
      expect.anything(),
    );
  });

  it("lanza ApiError en respuestas no exitosas", async () => {
    stubFetch({ ok: false, status: 404, statusText: "Not Found" });

    await expect(fetchMapa("desconocido")).rejects.toBeInstanceOf(ApiError);
  });
});
