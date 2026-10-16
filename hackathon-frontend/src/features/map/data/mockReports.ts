import type { FloodReport } from "../types/report";

/**
 * ⚠️ DATOS FICTICIOS SOLO PARA DESARROLLO.
 * No representan inundaciones reales ni información verificada.
 * El `verificationStatus` es igualmente ficticio: no se deduce de ninguna API.
 * Deben sustituirse por datos del backend antes de cualquier demo o entrega.
 */
export const MOCK_FLOOD_REPORTS: FloodReport[] = [
  {
    id: "rep-001",
    latitude: 25.5668,
    longitude: -108.4735,
    description:
      "Agua acumulada a la altura de la banqueta frente al mercado municipal.",
    severity: "low",
    createdAt: "2026-10-12T15:20:00-07:00",
    verificationStatus: "pending",
  },
  {
    id: "rep-002",
    latitude: 25.5791,
    longitude: -108.4602,
    description: "Calle anegada: el agua cubre media llanta de los autos.",
    severity: "high",
    createdAt: "2026-10-13T09:05:00-07:00",
    verificationStatus: "verified",
  },
  {
    id: "rep-003",
    latitude: 25.5605,
    longitude: -108.4801,
    description: "Encharcamiento leve tras la lluvia de la madrugada.",
    severity: "low",
    createdAt: "2026-10-13T07:40:00-07:00",
    verificationStatus: "pending",
  },
  {
    id: "rep-004",
    latitude: 25.5843,
    longitude: -108.4756,
    description: "Un canal se desbordó hacia la avenida principal.",
    severity: "high",
    createdAt: "2026-10-14T18:30:00-07:00",
    verificationStatus: "verified",
  },
  {
    id: "rep-005",
    latitude: 25.5712,
    longitude: -108.4558,
    description:
      "Paso a desnivel inundado; tránsito cerrado en ambos sentidos.",
    severity: "high",
    createdAt: "2026-10-14T20:10:00-07:00",
    verificationStatus: "pending",
  },
  {
    id: "rep-006",
    latitude: 25.5534,
    longitude: -108.4649,
    description: "Fuga de agua sobre la vialidad y pavimento dañado.",
    severity: "medium",
    createdAt: "2026-10-15T08:15:00-07:00",
    verificationStatus: "rejected",
  },
  {
    id: "rep-007",
    latitude: 25.5777,
    longitude: -108.4883,
    description: "Colonia sin drenaje: agua estancada con mal olor.",
    severity: "medium",
    createdAt: "2026-10-15T11:50:00-07:00",
    // Sin `verificationStatus`: prueba que los componentes toleran su ausencia.
  },
];
