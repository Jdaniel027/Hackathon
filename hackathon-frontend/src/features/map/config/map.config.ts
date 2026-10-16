export const MAP_CONFIG = {
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: [-108.47, 25.57] as [number, number],
  zoom: 12,
  minZoom: 5,
  maxZoom: 19,
  /** Municipio por defecto para `GET /api/v1/mapa/:municipioSlug` (demo: Mazatlán). */
  municipioSlug: "mazatlan",
};
