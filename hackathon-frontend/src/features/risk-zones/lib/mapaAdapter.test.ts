import { describe, expect, it } from "vitest";

import type { MapaResponse } from "../types/mapaApi";
import { adaptMapaResponse, riskStatusFromRiskZone } from "./mapaAdapter";

const MAPA: MapaResponse = {
  municipio: "mazatlan",
  actualizadoEn: "2026-10-16T12:00:00.000Z",
  zonas: [],
  zonasRiesgo: [
    {
      id: 1,
      lat: 25.572,
      lng: -108.4715,
      radioM: 600,
      motivo: "INUNDACION",
      origen: "CICLON",
      venceEn: null,
    },
    {
      id: 2,
      lat: 25.5735,
      lng: -108.484,
      radioM: 500,
      motivo: "INUNDACION",
      origen: "CLIMA",
      venceEn: "2026-10-19T12:00:00.000Z",
    },
    {
      id: 3,
      lat: 25.568,
      lng: -108.475,
      radioM: 500,
      motivo: "ALTURA",
      origen: "MANUAL",
      venceEn: null,
    },
  ],
};

describe("riskStatusFromRiskZone (D-007)", () => {
  it("mapea huracán (CICLON) a riesgo y inundación a zona inundada", () => {
    expect(riskStatusFromRiskZone(MAPA.zonasRiesgo[0])).toBe("at_risk");
    expect(riskStatusFromRiskZone(MAPA.zonasRiesgo[1])).toBe("flooded");
  });

  it("deja el riesgo por altura sin estado público por ahora", () => {
    expect(riskStatusFromRiskZone(MAPA.zonasRiesgo[2])).toBeNull();
  });
});

describe("adaptMapaResponse", () => {
  it("omite las zonas sin estado público (ALTURA)", () => {
    const zones = adaptMapaResponse(MAPA);
    expect(zones.features).toHaveLength(2);
  });

  it("convierte cada zona en un círculo con origen y radio", () => {
    const zones = adaptMapaResponse(MAPA);
    const flooded = zones.features.find(
      (feature) => feature.properties.status === "flooded",
    );

    expect(flooded?.geometry.type).toBe("Polygon");
    expect(flooded?.properties.origin).toEqual({ lat: 25.5735, lng: -108.484 });
    expect(flooded?.properties.radiusM).toBe(500);
  });

  it("no duplica identidades", () => {
    const ids = adaptMapaResponse(MAPA).features.map((f) => f.properties.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produce una colección válida aunque no haya zonas de riesgo", () => {
    const zones = adaptMapaResponse({ ...MAPA, zonasRiesgo: [] });
    expect(zones.type).toBe("FeatureCollection");
    expect(zones.features).toHaveLength(0);
  });
});
