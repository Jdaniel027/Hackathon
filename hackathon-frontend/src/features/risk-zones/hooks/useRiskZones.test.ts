import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MapaResponse } from "../types/mapaApi";

vi.mock("../../../services/mapaService", () => ({
  fetchMapa: vi.fn(),
}));

// El import va después del `vi.mock` (se hoistea) para obtener el mock.
import { fetchMapa } from "../../../services/mapaService";
import { useRiskZones } from "./useRiskZones";

const fetchMapaMock = vi.mocked(fetchMapa);
const MUNICIPIO = "mazatlan";

describe("useRiskZones", () => {
  beforeEach(() => {
    fetchMapaMock.mockReset();
  });

  it("usa las zonas del backend cuando la API responde", async () => {
    const mapa: MapaResponse = {
      municipio: MUNICIPIO,
      actualizadoEn: "2026-10-16T00:00:00.000Z",
      zonas: [],
      zonasRiesgo: [
        {
          id: 7,
          lat: 25.57,
          lng: -108.47,
          radioM: 300,
          motivo: "INUNDACION",
          origen: "CLIMA",
          venceEn: null,
        },
      ],
    };
    fetchMapaMock.mockResolvedValue(mapa);

    const { result } = renderHook(() => useRiskZones(MUNICIPIO));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchMapaMock).toHaveBeenCalledWith(MUNICIPIO, expect.anything());
    expect(result.current.error).toBeNull();
    expect(result.current.zones.features).toHaveLength(1);
    expect(result.current.zones.features[0]?.properties.id).toBe("riesgo-7");
  });

  it("deja la colección vacía y avisa si la API falla (sin mocks)", async () => {
    fetchMapaMock.mockRejectedValue(new Error("sin backend"));

    const { result } = renderHook(() => useRiskZones(MUNICIPIO));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.zones.features).toHaveLength(0);
  });
});
