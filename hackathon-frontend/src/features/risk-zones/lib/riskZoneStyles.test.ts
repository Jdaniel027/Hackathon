import { describe, expect, it } from "vitest";

import { MOCK_RISK_ZONES } from "../data/mockRiskZones";
import {
  STATUS_FILL_COLORS,
  STATUS_LABELS,
  ZONE_STATUSES,
} from "./riskZoneStyles";

describe("estado visual de zonas (F1-03)", () => {
  it("define exactamente dos estados visuales excluyentes", () => {
    expect(ZONE_STATUSES).toEqual(["at_risk", "flooded"]);
  });

  it("usa colores distintos y definidos para riesgo e inundación", () => {
    const { at_risk, flooded } = STATUS_FILL_COLORS;
    expect(at_risk).toBeTruthy();
    expect(flooded).toBeTruthy();
    expect(at_risk).not.toBe(flooded);
  });

  it("asigna una etiqueta legible a cada estado", () => {
    for (const status of ZONE_STATUSES) {
      expect(STATUS_LABELS[status]).toBeTruthy();
    }
  });
});

describe("colección de zonas simulada", () => {
  it("no duplica la identidad de una misma zona", () => {
    const ids = MOCK_RISK_ZONES.features.map((feature) => feature.properties.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("incluye una zona de riesgo y una inundada", () => {
    const statuses = MOCK_RISK_ZONES.features.map(
      (feature) => feature.properties.status,
    );
    expect(statuses).toContain("at_risk");
    expect(statuses).toContain("flooded");
  });
});
