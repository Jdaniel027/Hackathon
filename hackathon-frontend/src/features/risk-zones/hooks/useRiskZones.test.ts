import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { RiskZoneCollection } from "../types/riskZone";
import { useRiskZones } from "./useRiskZones";

describe("useRiskZones", () => {
  it("cambia el estado de la primera zona sin duplicarla", () => {
    const { result } = renderHook(() => useRiskZones());
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

  it("devuelve la colección actualizada", () => {
    const { result } = renderHook(() => useRiskZones());

    let updated: RiskZoneCollection | undefined;
    act(() => {
      updated = result.current.transitionFirstZone();
    });

    expect(updated).toBeDefined();
    expect(updated?.features).toHaveLength(result.current.zones.features.length);
  });
});
