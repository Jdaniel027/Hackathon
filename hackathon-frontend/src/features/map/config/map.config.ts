export const MAP_CONFIG = {
  style: "https://tiles.openfreemap.org/styles/liberty",
  /** Centro inicial del mapa. */
  center: [-108.47, 25.57] as [number, number],
  zoom: 12,
  minZoom: 5,
  maxZoom: 19,
  /**
   * Municipio que se consulta en `GET /api/v1/mapa/:municipioSlug`. El backend
   * de demo solo siembra `mazatlan`; si el slug no existe, la API responde 404
   * y el mapa queda sin zonas (no hay datos de reserva).
   */
  municipioSlug: "mazatlan",
};
