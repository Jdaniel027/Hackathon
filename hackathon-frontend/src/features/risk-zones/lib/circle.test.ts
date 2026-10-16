import { describe, expect, it } from "vitest";

import { createCirclePolygon, M_PER_DEGREE } from "./circle";

describe("createCirclePolygon", () => {
  it("cierra el anillo (primer punto === último)", () => {
    const polygon = createCirclePolygon(25.57, -108.47, 500, 32);
    const ring = polygon.coordinates[0];

    expect(polygon.type).toBe("Polygon");
    // 32 pasos → 33 vértices (el último cierra el anillo).
    expect(ring).toHaveLength(33);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it("genera un anillo alrededor del centro", () => {
    const lat = 25.57;
    const lng = -108.47;
    const ring = createCirclePolygon(lat, lng, 500, 64).coordinates[0];

    const lats = ring.map((punto) => punto[1]);
    const lngs = ring.map((punto) => punto[0]);

    expect(Math.min(...lats)).toBeLessThan(lat);
    expect(Math.max(...lats)).toBeGreaterThan(lat);
    expect(Math.min(...lngs)).toBeLessThan(lng);
    expect(Math.max(...lngs)).toBeGreaterThan(lng);
  });

  it("respeta el radio en grados de latitud", () => {
    const lat = 25.57;
    const radioM = 500;
    const ring = createCirclePolygon(lat, -108.47, radioM, 128).coordinates[0];

    const maxDLat = Math.max(...ring.map((punto) => Math.abs(punto[1] - lat)));
    expect(maxDLat).toBeCloseTo(radioM / M_PER_DEGREE, 4);
  });

  it("usa coordenadas GeoJSON [lng, lat]", () => {
    const ring = createCirclePolygon(25.57, -108.47, 500, 8).coordinates[0];
    const [lng, lat] = ring[0];

    // La longitud es negativa (Mazatlán) y la latitud positiva.
    expect(lng).toBeLessThan(0);
    expect(lat).toBeGreaterThan(0);
  });
});
