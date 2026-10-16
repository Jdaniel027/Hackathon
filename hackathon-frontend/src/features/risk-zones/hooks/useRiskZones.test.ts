import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MapaResponse } from "../types/mapaApi";
import type { RiskZoneCollection } from "../types/riskZone";

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
    expect(result.current.source).toBe("api");
    expect(result.current.error).toBeNull();
    expect(result.current.zones.features).toHaveLength(1);
    expect(result.current.zones.features[0]?.properties.id).toBe("riesgo-7");
  });

  it("cae a datos de demostración si la API falla", async () => {
    fetchMapaMock.mockRejectedValue(new Error("sin backend"));

    const { result } = renderHook(() => useRiskZones(MUNICIPIO));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.source).toBe("mock");
    expect(result.current.error).toBeTruthy();
    expect(result.current.zones.features.length).toBeGreaterThan(0);
  });

  it("cambia el estado de la primera zona sin duplicarla", async () => {
    fetchMapaMock.mockRejectedValue(new Error("sin backend"));
    const { result } = renderHook(() => useRiskZones(MUNICIPIO));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const before = result.current.zones.features.length;
    const first = result.current.zones.features[0];
    const initialStatus = first?.properties.status;

    act(() => {
      result.current.transitionFirstZone();
    });

    const updatedZone = result.current.zones.features.find(
      (feature) => feature.properties.id === first?.properties.id,
    );

    expect(updatedZone?.properties.status).not.toBe(initialStatus);
    expect(result.current.zones.features).toHaveLength(before);
  });

  it("devuelve la colección actualizada al transicionar", async () => {
    fetchMapaMock.mockRejectedValue(new Error("sin backend"));
    const { result } = renderHook(() => useRiskZones(MUNICIPIO));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let updated: RiskZoneCollection | undefined;
    act(() => {
      updated = result.current.transitionFirstZone();
    });

    expect(updated).toBeDefined();
    expect(updated?.features).toHaveLength(result.current.zones.features.length);
  });
});
