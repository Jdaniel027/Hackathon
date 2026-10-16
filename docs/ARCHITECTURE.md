# Arquitectura aprobada — UrbanGO Flood

## Stack aprobado
- React + Vite + TypeScript (no Next.js ni App Router).
- MapLibre GL JS + GeoJSON para el mapa.
- Backend externo vía HTTP; el frontend no calcula clasificación ni verifica reportes.
- Mobile-first. Figma es referencia visual; no introducir Tailwind ni otra biblioteca de UI sin revisar las dependencias existentes y obtener aprobación.
- Estado local React por defecto; gestión global solo con necesidad justificada.

## Organización prevista (adaptar al repositorio real)
- `src/app/App.tsx`: composición e integración acordada, F1.
- `src/features/map/`: mapa, capas, selección, geolocalización y selector de ubicación, F1.
- `src/features/risk-zones/`: representación geográfica y adaptación de zonas, F1.
- `src/features/zone-details/`: Bottom Sheet y detalles, F2.
- `src/features/reports/`: formulario, consultas, fotos y UI de reportes, F2.
- `src/components/ui/`, `src/types/`, `src/lib/`, `src/hooks/`, `src/mocks/`: compartidos, cambios coordinados.
- `src/services/`: cliente HTTP único y servicios acordados.
- `src/layouts/`: composición visual, F2.

## Contratos y límites
- Una zona GeoJSON tiene un estado visual excluyente `at_risk` (amarillo) o `flooded` (rojo), asignado por backend. No duplicar el polígono por estado.
- Dos filtros independientes; ninguna capa pública de reportes.
- Reportes `pending`/`rejected` privados; `confirmed` visibles solo en detalles de zonas asociadas.
- `MapView` emite selección por ID; no controla Bottom Sheet. `LocationPicker` devuelve coordenadas al formulario por callback.
- Mocks explícitos; endpoints definitivos únicamente después de acuerdo con backend.
- No crear segundo mapa, cliente HTTP paralelo ni nuevas rutas sin aprobación.

## Cambios
Registrar propuestas y aprobaciones en `DECISIONS.md` antes de cambios estructurales. Inspeccionar el código antes de aplicar este diseño de carpetas.
