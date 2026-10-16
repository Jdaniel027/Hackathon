import { describe, expect, it } from "vitest";

import {
  DEFAULT_STATUS_VISIBILITY,
  hasVisibleStatus,
  toggleStatusVisibility,
} from "./zoneFilters";

describe("filtros de zonas (F1-06 / F1-07 / F1-08)", () => {
  it("empieza con los dos filtros activos", () => {
    expect(DEFAULT_STATUS_VISIBILITY).toEqual({
      at_risk: true,
      flooded: true,
    });
  });

  it("alterna un filtro sin afectar al otro", () => {
    const onlyFlooded = toggleStatusVisibility(
      DEFAULT_STATUS_VISIBILITY,
      "at_risk",
    );
    expect(onlyFlooded.at_risk).toBe(false);
    expect(onlyFlooded.flooded).toBe(true);
  });

  it("no muta la visibilidad original", () => {
    toggleStatusVisibility(DEFAULT_STATUS_VISIBILITY, "flooded");
    expect(DEFAULT_STATUS_VISIBILITY.flooded).toBe(true);
  });

  it("detecta cuando no queda ningún filtro activo", () => {
    const none = toggleStatusVisibility(
      toggleStatusVisibility(DEFAULT_STATUS_VISIBILITY, "at_risk"),
      "flooded",
    );
    expect(hasVisibleStatus(none)).toBe(false);
  });

  it("detecta cuando hay al menos un filtro activo", () => {
    expect(hasVisibleStatus(DEFAULT_STATUS_VISIBILITY)).toBe(true);
  });
});
