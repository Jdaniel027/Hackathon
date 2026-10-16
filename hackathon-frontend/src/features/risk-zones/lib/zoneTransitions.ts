import type { RiskZoneCollection, ZoneStatus } from "../types/riskZone";

/**
 * Devuelve una copia de la colección con el estado visual de `zoneId`
 * actualizado. La actualización es **inmutable**: no muta la entrada ni
 * duplica la zona (sigue habiendo un único polígono por id).
 *
 * Si la zona no existe o ya tiene ese estado, se devuelve la **misma
 * referencia** para no provocar repintados innecesarios en el mapa.
 *
 * Es el mecanismo de transición mock de F1-04. Cuando el backend confirme un
 * cambio de estado, la sustitución de datos será la misma: `source.setData`,
 * que actualiza color y categoría sin recrear el mapa.
 */
export function applyZoneStatus(
  collection: RiskZoneCollection,
  zoneId: string,
  status: ZoneStatus,
): RiskZoneCollection {
  let changed = false;

  const features = collection.features.map((feature) => {
    if (feature.properties.id !== zoneId) return feature;
    if (feature.properties.status === status) return feature;

    changed = true;
    return {
      ...feature,
      properties: { ...feature.properties, status },
    };
  });

  return changed ? { ...collection, features } : collection;
}
