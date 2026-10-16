# Sistema de diseño — UrbanGO Flood

> Referencia normativa para OpenCode. Aplicar junto con las pantallas Figma aprobadas. No rediseñar ni improvisar estilos en cada tarea. Los valores no extraídos de Figma/código siguen pendientes de confirmación.

## Principios
- Mobile-first, mapa como superficie principal y controles flotantes discretos.
- Jerarquía visual clara; panel inferior (Bottom Sheet) para detalles.
- Accesibilidad: contraste, foco visible, etiquetas y objetivos táctiles adecuados.
- Una sola fuente de tokens de color, tipografía, radios, sombras y espaciado, respetando la estructura CSS existente.

## Semántica visual obligatoria
- **Zona de riesgo:** amarillo. Estado de datos: `at_risk`.
- **Zona inundada confirmada:** rojo. Estado de datos: `flooded`.
- Cada zona tiene un único color de estado; al cambiar estado también cambia su ficha y filtro.
- El riesgo histórico (bajo/medio/alto/desconocido) es información distinta del estado actual.
- No mostrar reportes pendientes ni rechazados; no crear pines ni tercera capa.
- Si no hay datos actuales, no afirmar que la zona es segura.

## Tokens
| Token | Uso | Estado |
|---|---|---|
| `--zone-risk` | Relleno amarillo de zona de riesgo | Semántica aprobada; HEX exacto por validar con Figma |
| `--zone-flooded` | Relleno rojo de zona inundada | Semántica aprobada; HEX exacto por validar con Figma |
| `--color-primary` | Acciones principales | Pendiente de extraer |
| `--color-background` | Fondo de superficies | Pendiente de extraer |
| `--color-surface` | Paneles y tarjetas | Pendiente de extraer |
| `--color-text` | Texto principal | Pendiente de extraer |
| `--color-muted` | Texto secundario | Pendiente de extraer |
| `--font-family` | Tipografía | Pendiente de extraer |
| `--radius-*`, `--space-*`, `--shadow-*` | Formas, espacios y elevación | Pendiente de extraer |

**No interpretar valores provisionales de mocks o ejemplos como tokens aprobados.** Revisar el CSS y Figma antes de asignar valores numéricos. No instalar Tailwind solo porque aparecía en un documento anterior.

## Patrones de interfaz aprobados
- **Mapa:** pantalla completa; filtros independientes Riesgo/Inundadas, ubicación actual y botón de cámara para reportar.
- **Polígonos:** GeoJSON real o mocks identificados; selección y resaltado sin ocultar su estado semántico.
- **Bottom Sheet:** compacto, resumen y expandido; pestañas Información y Reportes; el contenido responde al estado actual de la zona.
- **Reportes de zona:** solo confirmados asociados, fotografía ampliable; vacío específico: «No hay reportes confirmados disponibles para esta zona».
- **Formulario:** ubicación seleccionada en mapa con pin fijo, foto con vista previa, nivel observado y descripción opcional; confirmación privada después del éxito del backend.
- **Estados:** loading, vacío, error, éxito y permisos denegados, sin inventar datos.

## Regla obligatoria para agentes
1. Antes de tocar estilos, consultar este documento, Figma y los estilos existentes.
2. No cambiar paleta, tipografía, espaciado, navegación, iconografía o comportamiento de paneles por preferencia propia.
3. Si faltan tokens exactos, conservar los existentes y registrar propuesta en `DECISIONS.md`; solicitar aprobación.
4. Cambiar solo archivos de la tarea asignada; no hacer refactor visual general.
5. Validar en vista móvil y comprobar que controles y Bottom Sheet no impiden el uso del mapa.
