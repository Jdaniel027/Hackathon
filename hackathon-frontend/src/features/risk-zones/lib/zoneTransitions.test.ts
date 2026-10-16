import { describe, expect, it } from "vitest";

import { MOCK_RISK_ZONES } from "../data/mockRiskZones";
import { applyZoneStatus } from "./zoneTransitions";

describe("applyZoneStatus", () => {
  it("actualiza el estado de la zona indicada", () => {
    const updated = applyZoneStatus(MOCK_RISK_ZONES, "rz-002", "at_risk");
    const zone = updated.features.find((f) => f.properties.id === "rz-002");
    expect(zone?.properties.status).toBe("at_risk");
  });

  it("no muta la colección original", () => {
    applyZoneStatus(MOCK_RISK_ZONES, "rz-002", "at_risk");
    const zone = MOCK_RISK_ZONES.features.find((f) => f.properties.id === "rz-002");
    expect(zone?.properties.status).toBe("flooded");
  });

  it("no duplica la zona al cambiar de estado", () => {
    const updated = applyZoneStatus(MOCK_RISK_ZONES, "rz-002", "at_risk");
    expect(updated.features).toHaveLength(MOCK_RISK_ZONES.features.length);
    const matches = updated.features.filter((f) => f.properties.id === "rz-002");
    expect(matches).toHaveLength(1);
  });

  it("devuelve la misma referencia si el estado no cambia", () => {
    const updated = applyZoneStatus(MOCK_RISK_ZONES, "rz-001", "at_risk");
    expect(updated).toBe(MOCK_RISK_ZONES);
  });

  it("devuelve la misma referencia si la zona no existe", () => {
    const updated = applyZoneStatus(MOCK_RISK_ZONES, "rz-999", "flooded");
    expect(updated).toBe(MOCK_RISK_ZONES);
  });

  it("deja cada zona en un único estado excluyente", () => {
    const updated = applyZoneStatus(MOCK_RISK_ZONES, "rz-001", "flooded");
    const atRisk = updated.features.filter(
      (f) => f.properties.status === "at_risk",
    ).length;
    const flooded = updated.features.filter(
      (f) => f.properties.status === "flooded",
    ).length;

    // Cada feature suma en exactamente una categoría.
    expect(atRisk + flooded).toBe(updated.features.length);
    const changed = updated.features.find((f) => f.properties.id === "rz-001");
    expect(changed?.properties.status).toBe("flooded");
  });
});
