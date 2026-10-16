import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useUserLocation } from "./useUserLocation";

const originalGeolocation = navigator.geolocation;

function setGeolocation(value: unknown) {
  Object.defineProperty(navigator, "geolocation", {
    value,
    configurable: true,
  });
}

afterEach(() => {
  setGeolocation(originalGeolocation);
});

describe("useUserLocation", () => {
  it("marca 'unavailable' si el navegador no soporta geolocalización", () => {
    setGeolocation(undefined);
    const { result } = renderHook(() => useUserLocation());

    act(() => {
      result.current.locate();
    });

    expect(result.current.status).toBe("unavailable");
  });

  it("guarda las coordenadas al obtener la posición", () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: { longitude: -108.47, latitude: 25.57 },
      } as GeolocationPosition);
    });
    setGeolocation({ getCurrentPosition });

    const { result } = renderHook(() => useUserLocation());
    act(() => {
      result.current.locate();
    });

    expect(result.current.status).toBe("available");
    expect(result.current.coordinates).toEqual([-108.47, 25.57]);
  });

  it("traduce el permiso denegado y descarta coordenadas previas", () => {
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error?: PositionErrorCallback) => {
        error?.({ code: 1, message: "denied" } as GeolocationPositionError);
      },
    );
    setGeolocation({ getCurrentPosition });

    const { result } = renderHook(() => useUserLocation());
    act(() => {
      result.current.locate();
    });

    expect(result.current.status).toBe("denied");
    expect(result.current.coordinates).toBeNull();
  });
});
