import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Map } from "maplibre-gl";

import { Marker } from "maplibre-gl";
import { useUserLocationMarker } from "./useUserLocationMarker";

const { mockMarker } = vi.hoisted(() => ({
  mockMarker: {
    setLngLat: vi.fn(),
    addTo: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("maplibre-gl", () => ({
  Marker: vi.fn(function MarkerMock() {
    return mockMarker;
  }),
}));

const map = { id: "map" } as unknown as Map;
const coordinates: [number, number] = [-108.47, 25.57];

beforeEach(() => {
  vi.clearAllMocks();
  mockMarker.setLngLat.mockReturnValue(mockMarker);
  mockMarker.addTo.mockReturnValue(mockMarker);
});

describe("useUserLocationMarker", () => {
  it("no dibuja el punto si no hay coordenadas", () => {
    renderHook(() => useUserLocationMarker(map, null));
    expect(Marker).not.toHaveBeenCalled();
  });

  it("dibuja el punto azul y lo limpia al desmontar", () => {
    const { unmount } = renderHook(() =>
      useUserLocationMarker(map, coordinates),
    );

    expect(Marker).toHaveBeenCalledTimes(1);
    expect(mockMarker.setLngLat).toHaveBeenCalledWith(coordinates);
    expect(mockMarker.addTo).toHaveBeenCalledWith(map);

    unmount();
    expect(mockMarker.remove).toHaveBeenCalledTimes(1);
  });
});
