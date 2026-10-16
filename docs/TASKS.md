# Tablero de tareas — UrbanGO Flood

> **Estado inicial sin auditar.** No declarar tareas completas hasta que OpenCode revise el repositorio y ejecute validaciones. IDs y secuencia: plan maestro actualizado.

## Fase actual
**POR DETERMINAR MEDIANTE AUDITORÍA.** Puede existir trabajo parcial de mapa/GeoJSON. No comenzar de cero ni avanzar de fase automáticamente.

## Próxima tarea
| ID | Responsable | Tarea | Estado | Dependencia |
|---|---|---|---|---|
| P0-01 | F1 | Auditar repositorio, dependencias, mapa y GeoJSON existentes | PENDIENTE DE AUDITORÍA | Acceso al código |
| P0-02 | F1 + F2 | Revisar contratos compartidos de zonas/reportes/coordenadas | PENDIENTE DE AUDITORÍA | P0-01 |
| P0-03 | F1 + F2 | Acordar callbacks, selección y visibilidad | PENDIENTE DE AUDITORÍA | P0-02 |
| P0-04 | F1 + F2 | Revisar mocks explícitos | PENDIENTE DE AUDITORÍA | P0-02 |
| P0-05 | F1 + F2 | Confirmar propiedad de archivos | PENDIENTE DE AUDITORÍA | P0-01 |
| P0-06 | F1 | Verificar estrategia de ramas con equipo | PENDIENTE DE AUDITORÍA | P0-05 |
| P0-07 | F1 + F2 | Verificar build y scripts existentes | PENDIENTE DE AUDITORÍA | P0-01 |

## Trabajo posterior
- F1: mapa/GeoJSON → colores amarillo/rojo → filtros → selección → geolocalización → selector de ubicación → backend.
- F2: componentes según Figma → Bottom Sheet → detalle y reportes confirmados → formulario → backend.
- Backend: clasificación y geometrías, verificación de reportes, fotografías, contratos de API.

## Protocolo
Cada tarea debe registrar ID, responsable, archivos permitidos, dependencias, estado y evidencia de prueba. No modificar archivos compartidos simultáneamente. Solicitar permiso antes de cambiar carpetas ajenas. No realizar commits o pushes sin orden explícita.

## Estados
PENDIENTE / EN PROGRESO / PARCIAL / COMPLETADA (verificada) / BLOQUEADA / OBSOLETA.

## Informe de auditoría
OpenCode debe rellenar la tabla de progreso F1 a partir del **código real** y el plan maestro, identificar la primera tarea pendiente y no modificar archivos durante la auditoría.
