# Registro de decisiones — UrbanGO Flood

## D-001 — Stack frontend
- Estado: APROBADO
- Fecha: 2026-10-16
- Decisión: React + Vite + TypeScript y MapLibre GL JS + GeoJSON; backend separado.
- Contexto: priorizar experiencia existente del equipo y mapa mobile-first.
- Impacto: quedan reemplazadas las propuestas previas de Next.js/App Router. Tailwind no se considera aprobado por este registro.
- Aprobación: decisión comunicada por el equipo en la planificación.

## D-002 — Estados visuales de zonas
- Estado: APROBADO
- Fecha: 2026-10-16
- Decisión: amarillo `at_risk` y rojo `flooded`, mutuamente excluyentes por geometría; dos filtros independientes. Backend decide transiciones y alcance geográfico.
- Impacto: no superponer representaciones de la misma zona ni colorear de rojo zonas completas por evidencia puntual insuficiente.
- Aprobación: decisión del producto.

## D-003 — Publicación de reportes
- Estado: APROBADO
- Fecha: 2026-10-16
- Decisión: sin marcadores/capa pública de reportes; solo confirmados asociados en detalles de zona. Pendientes/rechazados permanecen internos.
- Impacto: eliminar tareas de marcadores, filtros y selección pública de reportes; conservar envío y verificación.
- Aprobación: decisión del producto.

## D-004 — Diseño y tokens definitivos
- Estado: PENDIENTE DE EXTRACCIÓN
- Contexto: existen pantallas de referencia Figma, pero no se ha validado inventario exacto de estilos/tokens exportados.
- Decisión propuesta: centralizar tokens CSS después de auditar código y referencia visual; no inventar valores como si fueran oficiales.
- Impacto: conservar estilos existentes hasta validación.

## D-005 — Persistencia local de reportes e imágenes (24 h)
- Estado: PROPUESTO
- Fecha: 2026-10-16
- Contexto: el MVP no define persistencia; backend aún no ha acordado el almacenamiento de fotografías.
- Decisión propuesta: las imágenes y los reportes ciudadanos no se guardan en base de datos; se almacenan localmente en el navegador del usuario con un límite de 24 horas, tras el cual se descartan. El backend sigue siendo la fuente de verdad para la verificación y el estado de las zonas.
- Alcance: afecta a F2 (formulario, fotos, servicios de reportes) y a la coordinación con backend; no afecta a F1 (mapa y zonas).
- Impacto: datos efímeros y privacidad por defecto; no sobreviven a la limpieza del almacenamiento ni a cambios de dispositivo. El mecanismo concreto queda por definir con F2/backend.
- Aprobado por: PENDIENTE.

## D-006 — Tokens de color de zona (HEX)
- Estado: PROPUESTO
- Fecha: 2026-10-16
- Contexto: `DESIGN_SYSTEM.md` aprueba la semántica amarillo/rojo, pero los HEX exactos de `--zone-risk` y `--zone-flooded` están por validar con Figma.
- Decisión propuesta: usar de forma provisional y centralizada `--zone-risk` = `#facc15` (amarillo, `at_risk`) y `--zone-flooded` = `#ef4444` (rojo, `flooded`), definidos en un único módulo (`features/risk-zones/lib/riskZoneStyles.ts`) y sustituibles por los tokens definitivos.
- Impacto: un solo origen de color; migrable a custom properties CSS cuando Figma valide los valores. No introduce librerías nuevas.
- Aprobado por: PENDIENTE.

## D-007 — Origen y alcance de los estados de zona
- Estado: APROBADO
- Fecha: 2026-10-16
- Contexto: se precisa el alcance de los estados visuales definidos en D-002.
- Decisión: el estado `at_risk` (amarillo) se reserva **exclusivamente a riesgo por huracán** detectado por backend/fuente meteorológica; nunca se asigna por reportes ciudadanos. Un reporte ciudadano aprobado solo puede resultar en `flooded` (rojo). El estado `flooded` cubre inundación confirmada por huracán o por reportes ciudadanos confirmados. El backend decide siempre el estado final.
- Rótulos de interfaz: la zona amarilla se rotula «Zona de riesgo por huracán»; los dos filtros independientes pasan a «Huracán» e «Inundadas».
- Impacto: no cambia el modelo de dos colores ni el contrato de `status`; sí la procedencia de cada estado. F2 y backend deben aplicar que la aprobación de reportes solo genere `flooded`.
- Aprobación: decisión del producto (precisa el alcance de D-002).

## Plantilla
### D-XXX — Título
- Estado: PROPUESTO / APROBADO / REEMPLAZADO
- Contexto:
- Decisión:
- Alternativas:
- Impacto:
- Aprobado por:
- Fecha:

Los agentes pueden proponer decisiones, pero no aprobarlas por su cuenta.
