import { describe, expect, it } from "vitest";

import { M_PER_DEGREE } from "./circle";
import { createSquarePolygon } from "./rectangle";

const LAT = 25.572;
const LNG = -108.4715;
const LADO = 9000;

describe("createSquarePolygon", () => {
  const poly = createSquarePolygon(LAT, LNG, LADO);
  const ring = poly.coordinates[0];

  it("es un polígono con un anillo cerrado de 5 posiciones", () => {
    expect(poly.type).toBe("Polygon");
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[4]);
  });

  it("está centrado en el punto dado", () => {
    const lngs = ring.map((punto) => punto[0]);
    const lats = ring.map((punto) => punto[1]);

    expect((Math.min(...lngs) + Math.max(...lngs)) / 2).toBeCloseTo(LNG, 6);
    expect((Math.min(...lats) + Math.max(...lats)) / 2).toBeCloseTo(LAT, 6);
  });

  it("tiene lados de ~ladoM metros", () => {
    const lngs = ring.map((punto) => punto[0]);
    const lats = ring.map((punto) => punto[1]);
    const cosLat = Math.cos((LAT * Math.PI) / 180);

    const altoM = (Math.max(...lats) - Math.min(...lats)) * M_PER_DEGREE;
    const anchoM =
      (Math.max(...lngs) - Math.min(...lngs)) * M_PER_DEGREE * cosLat;

    expect(altoM).toBeCloseTo(LADO, 0);
    expect(anchoM).toBeCloseTo(LADO, 0);
  });
});
