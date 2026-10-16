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
