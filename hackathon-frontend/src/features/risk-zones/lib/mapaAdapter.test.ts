import { describe, expect, it } from "vitest";

import type { MapaResponse } from "../types/mapaApi";
import {
  adaptMapaResponse,
  riskStatusFromRiskZone,
  zonaStatusFromZona,
} from "./mapaAdapter";

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

const MAPA_CON_MALLA: MapaResponse = {
  ...MAPA,
  zonas: [
    {
      id: 10,
      latCentro: 25.572,
      lngCentro: -108.4715,
      ladoM: 9000,
      estado: "INUNDADO",
      mm1h: 45,
      mm24h: 120,
    },
    {
      id: 11,
      latCentro: 25.6528,
      lngCentro: -108.4715,
      ladoM: 9000,
      estado: "PRECAUCION",
      mm1h: 25,
      mm24h: 60,
    },
    {
      id: 12,
      latCentro: 25.4912,
      lngCentro: -108.4715,
      ladoM: 9000,
      estado: "NORMAL",
      mm1h: 3,
      mm24h: 8,
    },
    {
      id: 13,
      latCentro: 25.572,
      lngCentro: -108.5611,
      ladoM: 9000,
      estado: "SIN_DATOS",
      mm1h: 0,
      mm24h: 0,
    },
  ],
};

describe("zonaStatusFromZona (estado de la malla)", () => {
  it("solo pinta INUNDADO; el resto queda pendiente de color", () => {
    expect(zonaStatusFromZona(MAPA_CON_MALLA.zonas[0])).toBe("flooded");
    expect(zonaStatusFromZona(MAPA_CON_MALLA.zonas[1])).toBeNull();
    expect(zonaStatusFromZona(MAPA_CON_MALLA.zonas[2])).toBeNull();
    expect(zonaStatusFromZona(MAPA_CON_MALLA.zonas[3])).toBeNull();
  });
});

describe("adaptMapaResponse con malla", () => {
  it("añade los cuadros con estado público como polígonos", () => {
    const zones = adaptMapaResponse(MAPA_CON_MALLA);
    // 2 riesgos (ALTURA se omite) + 1 cuadro (INUNDADO).
    expect(zones.features).toHaveLength(3);

    const cuadro = zones.features.find(
      (feature) => feature.properties.id === "zona-10",
    );
    expect(cuadro?.geometry.type).toBe("Polygon");
    expect(cuadro?.properties.status).toBe("flooded");
    expect(cuadro?.properties.rainMm1h).toBe(45);
    expect(cuadro?.properties.rainMm24h).toBe(120);
    expect(cuadro?.properties.origin).toBeUndefined();
  });

  it("no mezcla identidades entre malla y riesgos", () => {
    const ids = adaptMapaResponse(MAPA_CON_MALLA).features.map(
      (feature) => feature.properties.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("zona-10");
    expect(ids).toContain("riesgo-1");
  });
});
