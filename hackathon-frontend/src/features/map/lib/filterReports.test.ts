import { describe, expect, it } from "vitest";

import type { FloodReport } from "../types/report";
import {
  EMPTY_REPORT_FILTERS,
  filterReports,
  isFilterActive,
} from "./filterReports";

const reports: FloodReport[] = [
  {
    id: "a",
    latitude: 25.5,
    longitude: -108.5,
    description: "A",
    severity: "low",
    createdAt: "2026-10-12T15:20:00-07:00",
    verificationStatus: "pending",
  },
  {
    id: "b",
    latitude: 25.6,
    longitude: -108.4,
    description: "B",
    severity: "high",
    createdAt: "2026-10-13T09:05:00-07:00",
    verificationStatus: "verified",
  },
  {
    id: "c",
    latitude: 25.7,
    longitude: -108.3,
    description: "C",
    severity: "high",
    createdAt: "2026-10-14T09:05:00-07:00",
  },
];

describe("filterReports", () => {
  it("devuelve todos los reportes sin filtros", () => {
    expect(filterReports(reports, EMPTY_REPORT_FILTERS)).toEqual(reports);
  });

  it("filtra por severidad", () => {
    const result = filterReports(reports, {
      severities: ["high"],
      verificationStatuses: [],
    });
    expect(result.map((r) => r.id)).toEqual(["b", "c"]);
  });

  it("filtra por estado de verificación", () => {
    const result = filterReports(reports, {
      severities: [],
      verificationStatuses: ["pending"],
    });
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });

  it("excluye reportes sin estado al filtrar por verificación", () => {
    const result = filterReports(reports, {
      severities: [],
      verificationStatuses: ["verified", "pending"],
    });
    expect(result.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("combina severidad y verificación", () => {
    const result = filterReports(reports, {
      severities: ["high"],
      verificationStatuses: ["verified"],
    });
    expect(result.map((r) => r.id)).toEqual(["b"]);
  });

  it("devuelve un arreglo vacío cuando nada coincide", () => {
    const result = filterReports(reports, {
      severities: ["low"],
      verificationStatuses: ["rejected"],
    });
    expect(result).toEqual([]);
  });

  it("no muta la colección original", () => {
    const snapshot = [...reports];
    filterReports(reports, { severities: ["high"], verificationStatuses: [] });
    expect(reports).toEqual(snapshot);
  });
});

describe("isFilterActive", () => {
  it("es falso sin filtros", () => {
    expect(isFilterActive(EMPTY_REPORT_FILTERS)).toBe(false);
  });

  it("es verdadero con algún filtro", () => {
    expect(
      isFilterActive({ severities: ["low"], verificationStatuses: [] }),
    ).toBe(true);
  });
});
