import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { StatusVisibility } from "../lib/zoneFilters";
import { useZoneFilters } from "./useZoneFilters";

describe("useZoneFilters", () => {
  it("empieza con los dos filtros activos", () => {
    const { result } = renderHook(() => useZoneFilters());
    expect(result.current.statusVisibility).toEqual({
      at_risk: true,
      flooded: true,
    });
  });

  it("alterna un filtro sin afectar al otro y devuelve el resultado", () => {
    const { result } = renderHook(() => useZoneFilters());

    let returned: StatusVisibility | undefined;
    act(() => {
      returned = result.current.toggleStatus("at_risk");
    });

    expect(returned).toEqual({ at_risk: false, flooded: true });
    expect(result.current.statusVisibility).toEqual({
      at_risk: false,
      flooded: true,
    });
  });
});
