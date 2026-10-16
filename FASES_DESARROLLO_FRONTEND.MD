# UrbanGO Flood — Plan maestro de desarrollo del MVP

> **Documento de referencia para el equipo y OpenCode.**
> Estado: planificación inicial. Última revisión: 15 de octubre de 2026.
> **Importante:** las interfaces y rutas propuestas aquí son contratos de trabajo, no afirmaciones sobre el código existente. Antes de modificar archivos, inspeccionar el repositorio.

## 1. Objetivo del proyecto

UrbanGO Flood es una aplicación web **mobile-first** para visualizar zonas susceptibles a inundarse, identificar zonas con inundaciones actuales y permitir que la ciudadanía envíe reportes con fotografías. El mapa es el elemento principal de la experiencia.

### MVP obligatorio

1. Visualizar **zonas de riesgo** con información contextual.
2. Visualizar **zonas inundadas** y su estado actual, según datos disponibles y verificables.
3. Visualizar reportes ciudadanos en el mapa y en los detalles de las zonas.
4. Permitir crear reportes anónimos con **ubicación, fotografía y nivel observado** obligatorios; descripción opcional.
5. Verificar reportes automáticamente mediante información de una API externa, **cuando la evidencia sea suficiente**, y mostrar su estado.
6. Ofrecer una interfaz móvil clara: mapa, filtros de capas, panel de detalles y formulario.

### Fuera del MVP

- Autenticación y cuentas de usuario.
- Búsqueda y recomendación de rutas alternativas (posible mejora posterior).
- Simulación manual de escenarios de lluvia.
- Visualización de lluvia en tiempo real.
- Notificaciones push, panel administrativo y funciones no acordadas.

**Regla:** no ampliar el alcance sin aprobación explícita del equipo.

## 2. Stack y estado del proyecto

- Frontend: **React + Vite + TypeScript**.
- Mapa: **MapLibre GL JS**.
- Diseño: pantallas de referencia elaboradas en **Figma**, enfoque mobile-first.
- Arquitectura: carpetas organizadas por funcionalidades (_feature-based_).
- Estado conocido: se han hecho pruebas de integración del mapa; **no asumir que el resto está implementado**.
- Backend: equipo separado, responsable de APIs externas, lógica de verificación, persistencia y contratos de endpoints.

## 3. Reglas del dominio: no confundir conceptos

### 3.1 Zona de riesgo

Área susceptible a inundarse según una combinación de:

- Historial de inundaciones.
- Reportes anteriores, privilegiando los confirmados.
- Elevación del terreno, cuando exista una fuente fiable.
- Cercanía a ríos/cuerpos de agua y otros factores geográficos, cuando haya datos.

**No significa que esté inundada actualmente.** La clasificación puede ser `low`, `medium`, `high` o `unknown`. La lógica de clasificación corresponde al backend; no inferir riesgo solo por cantidad de reportes, altura baja o proximidad a un río.

### 3.2 Zona inundada / estado actual

Área con información sobre posible inundación actual, proveniente del backend y de datos externos de niveles de agua. El estado de inundación es independiente del riesgo histórico:

- `confirmed`: inundación confirmada por evidencia suficiente.
- `unconfirmed`: posible inundación, aún sin confirmar.
- `not_detected`: no se detecta inundación con los datos disponibles; **no garantiza ausencia de agua**.
- `unknown`: no hay datos suficientes.

La geometría de las zonas inundadas y de riesgo debe modelarse por separado, aunque se superpongan. No inventar polígonos confirmados a partir de un reporte pendiente.

### 3.3 Reporte ciudadano

Campos obligatorios: coordenadas, fotografía, nivel observado `low | medium | high` elegido por el usuario. Descripción opcional. Reportes anónimos.

Estados:

- `pending`: aún sin corroboración suficiente.
- `confirmed`: corroborado mediante evidencia externa aplicable a la ubicación y al momento.
- `rejected`: descartado con evidencia suficiente.

**Regla crítica:** si la API indica condiciones normales, está desactualizada o no cubre el punto reportado, **no rechazar automáticamente** el reporte. Dejar `pending` hasta disponer de evidencia suficiente. Un reporte pendiente no confirma por sí solo una inundación.

### 3.4 Datos opcionales

Mostrar cuando estén disponibles: fecha de última actualización, elevación del terreno, superficie aproximada en **km²**, fuente y fecha de datos. Mostrar “Sin datos” o no mostrar el campo cuando falte; nunca sustituir `null` por cero.

### 3.5 Origen de la verdad

El **backend** determina niveles de riesgo, estados de inundación, verificación de reportes y asociaciones geográficas. El frontend representa los datos recibidos y maneja interacciones; no duplica algoritmos de verificación.

## 4. Experiencia de usuario acordada

### Mapa

- Mapa a pantalla completa, optimizado para móvil.
- Menú para alternar **independientemente** las capas `Zonas de riesgo`, `Zonas inundadas`, `Reportes ciudadanos`.
- Botón para centrar ubicación actual, con manejo de permisos y errores.
- Botón flotante de cámara para crear reporte.
- Selección de polígonos o marcadores abre el panel correspondiente.
- Cuando coincidan marcadores y polígonos, priorizar el marcador en la selección.
- Si una capa se oculta, sus elementos no deben seguir siendo seleccionables de forma invisible.

### Bottom Sheet

- Estados: compacto, resumen e información expandida.
- Expansión/contracción por botón y arrastre vertical.
- Cierre tocando fuera, sin bloquear permanentemente el mapa.
- Pestañas `Información` y `Reportes` cuando apliquen.
- Contenido distinto para zona de riesgo, zona inundada y reporte individual.
- Estados vacíos específicos: “No hay reportes asociados” no debe usarse como mensaje genérico de falta de información.
- Visor de fotografía a pantalla completa.

### Creación de reporte

1. Abrir formulario “Reportar inundación”.
2. Seleccionar ubicación mediante mapa con pin fijo tipo gota y mapa móvil debajo.
3. Confirmar coordenadas y regresar al formulario **sin perder los demás campos**.
4. Adjuntar fotografía y previsualizarla (según diseño, JPG/PNG y máximo 10 MB; validar con backend).
5. Seleccionar nivel observado bajo/medio/alto.
6. Agregar descripción opcional.
7. Mostrar aviso de seguridad: no exponerse para tomar una fotografía.
8. Enviar al backend; mostrar confirmación **solo tras respuesta exitosa**.
9. Si el usuario cierra el formulario antes de enviarlo, descartar sus datos. Si falla el envío mientras sigue abierto, conservarlos para reintentar.

## 5. Distribución de responsabilidades

### Frontend 1 (F1): mapa y geografía

- Configuración y renderizado de MapLibre.
- Capas GeoJSON de riesgo e inundación.
- Colores/estilos de polígonos, controles y filtros de capas.
- Marcadores de reportes y selección de elementos.
- Geolocalización y centrado.
- Selector de ubicación del formulario.
- Servicios de lectura de información geográfica y adaptación al mapa.
- Responsable de integrar cambios en `App.tsx` y coordinar la rama `develop`.

**No implementar:** Bottom Sheet, tarjetas de detalle, formulario de reportes ni lógica de verificación del backend.

### Frontend 2 (F2): interfaz y reportes

- Bottom Sheet y gestos.
- Tarjetas, estados, pestañas y detalles de zonas y reportes.
- Listado de reportes asociados y visor de fotografías.
- Formulario, validaciones, carga de fotografías y mensajes de éxito/error.
- Servicios de envío/consulta de reportes y adaptación de datos para UI.

**No implementar:** un segundo mapa, capas GeoJSON, lógica de selección de polígonos o geolocalización interna de MapLibre.

### Backend (otro equipo)

- Investigar y conectar API de niveles de agua y posible API de elevación.
- Definir metodología de riesgo, disponibilidad de geometrías y verificación automática.
- Definir endpoints, formatos de respuesta, paginación y errores.
- Persistir reportes, estados y fotografías.
- Determinar asociación entre reportes y zonas.
- Proporcionar evidencia, fuente, fecha de actualización y cobertura de datos.

**Pendiente de backend:** endpoints, contratos definitivos, almacenamiento de imágenes, cobertura/actualización de APIs, geometrías de zonas, disponibilidad de elevación y superficie.

## 6. Estructura propuesta del repositorio

```text
src/
├── app/
│   ├── App.tsx                     # Integración: F1
│   └── providers/                  # Compartido, cambios coordinados
├── components/
│   └── ui/                         # Compartido, cambios coordinados
├── features/
│   ├── map/                        # F1: MapLibre, capas, marcadores, controles
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   ├── risk-zones/                 # F1: lógica de visualización geográfica
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   ├── zone-details/               # F2: paneles y detalles de zonas
│   │   ├── components/
│   │   └── hooks/
│   └── reports/                    # F2: UI y servicios de reportes
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types/
├── layouts/                         # F2: composición visual
├── services/                        # F1: lectura geográfica / cliente compartido acordado
├── hooks/                           # Compartido
├── types/                           # Contratos compartidos
├── lib/                             # Utilidades compartidas
└── mocks/                           # Datos simulados basados en contratos
```

**Nota:** es una propuesta. Ajustar a las carpetas existentes sin mover o borrar código funcional innecesariamente. Los marcadores del mapa pertenecen a `features/map/`, aunque representen reportes. Evitar dos clientes HTTP distintos.

## 7. Contratos provisionales para desarrollo paralelo

Los siguientes tipos son **ejemplos a consensuar en Fase 0**. Pueden cambiar cuando backend entregue contratos definitivos. No asumir endpoints ni campos adicionales como reales.

```ts
type RiskLevel = "low" | "medium" | "high" | "unknown";
type FloodStatus = "confirmed" | "unconfirmed" | "not_detected" | "unknown";
type ReportStatus = "pending" | "confirmed" | "rejected";
type ObservedLevel = "low" | "medium" | "high";

type Coordinates = { latitude: number; longitude: number };

type MapSelection =
  | { type: "risk-zone"; id: string }
  | { type: "flood-zone"; id: string }
  | { type: "report"; id: string }
  | null;

type LayerVisibility = {
  riskZones: boolean;
  floodedZones: boolean;
  reports: boolean;
};

// Geometría: usar GeoJSON Polygon/MultiPolygon y sus tipos de librería
// solo después de revisar dependencias instaladas.
type RiskZone = {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  geometry: unknown; // sustituir por tipo GeoJSON acordado
  elevationMeters?: number | null;
  areaKm2?: number | null;
  updatedAt?: string | null;
};

type FloodZone = {
  id: string;
  name?: string;
  status: FloodStatus;
  geometry: unknown; // sustituir por tipo GeoJSON acordado
  updatedAt?: string | null;
  areaKm2?: number | null;
};

type CitizenReport = {
  id: string;
  location: Coordinates;
  observedLevel: ObservedLevel;
  description?: string | null;
  photoUrl: string;
  status: ReportStatus;
  createdAt: string;
  zoneIds?: string[];
};
```

**Contrato de interacción sugerido:**

- `MapView` recibe datos y visibilidad de capas; emite `onSelect(MapSelection)`.
- `MapView` no abre ni manipula directamente `BottomSheet`.
- `App` o un controlador acordado mantiene `selection`, `activePanel`, `layerVisibility` y modo de selección de ubicación.
- `ZoneDetails` y `ReportDetails` reciben entidades por props y emiten acciones por callbacks.
- `LocationPicker` emite `onConfirm(Coordinates)` y `onCancel()`.
- `ReportForm` recibe coordenadas confirmadas; solicita abrir el selector mediante callback; mantiene sus propios campos.
- `ReportForm` utiliza un servicio de envío intercambiable (mock/real), no llama directamente a MapLibre.
- La actualización de reportes tras envío debe notificar al mapa para recargar/actualizar marcadores.

**Importante:** los estados y contratos se definen una vez, en una ubicación compartida. No duplicar definiciones incompatibles entre `features`.

## 8. Fases de desarrollo y tareas concretas

### FASE 0 — Preparación conjunta (bloqueante)

| ID    | Responsable | Tarea                                                                                  |
| ----- | ----------- | -------------------------------------------------------------------------------------- |
| P0-01 | F1          | Revisar repo, dependencias, estructura y pruebas existentes; preservar mapa funcional. |
| P0-02 | Ambos       | Definir tipos compartidos de zonas, inundaciones, reportes y coordenadas.              |
| P0-03 | Ambos       | Definir props, callbacks, estado de selección y reglas de interacción.                 |
| P0-04 | Ambos       | Crear mocks representativos (incluyendo estados desconocidos y datos faltantes).       |
| P0-05 | Ambos       | Documentar propiedad de archivos y procedimiento de integración.                       |
| P0-06 | F1          | Preparar `develop`, `feature/map` y `feature/ui-reports` desde la misma base.          |
| P0-07 | Ambos       | Ejecutar aplicación y compilación con éxito.                                           |

**Aceptación:** ambos pueden importar contratos y mocks comunes, compilar y trabajar sin modificar archivos del otro. Hacer commit de esta base antes de crear ramas de trabajo.

### FASE 1 — Mapa e interfaz base (paralela)

**Frontend 1**

| ID    | Tarea                                                        |
| ----- | ------------------------------------------------------------ |
| F1-01 | Ajustar MapLibre a diseño móvil a pantalla completa.         |
| F1-02 | Renderizar GeoJSON de zonas de riesgo.                       |
| F1-03 | Renderizar GeoJSON de zonas inundadas, separado del riesgo.  |
| F1-04 | Aplicar estilos según riesgo y estado, incluyendo `unknown`. |
| F1-05 | Crear controles flotantes del mapa.                          |
| F1-06 | Mostrar marcadores de reportes simulados.                    |

**Frontend 2**

| ID    | Tarea                                                     |
| ----- | --------------------------------------------------------- |
| F2-01 | Establecer componentes/estilos reutilizables según Figma. |
| F2-02 | Crear Bottom Sheet reutilizable.                          |
| F2-03 | Crear vistas compacto, resumen y expandido.               |
| F2-04 | Crear encabezados, tarjetas e indicadores de estado.      |
| F2-05 | Crear vistas de zona de riesgo e inundación.              |
| F2-06 | Crear pestañas Información y Reportes.                    |

**Aceptación:** mapa con capas y marcadores mock; paneles renderizables de forma independiente con mocks. Integración visual básica sin bloqueo del mapa.

### FASE 2 — Interacciones principales (paralela)

**Frontend 1**

| ID    | Tarea                                                          |
| ----- | -------------------------------------------------------------- |
| F1-07 | Crear menú de filtros de capas.                                |
| F1-08 | Alternar zonas de riesgo independientemente.                   |
| F1-09 | Alternar zonas inundadas independientemente.                   |
| F1-10 | Alternar marcadores de reportes independientemente.            |
| F1-11 | Detectar selección de polígonos y marcadores y emitir tipo/ID. |
| F1-12 | Resaltar selección y limpiar resaltado al cerrar/cambiar.      |
| F1-13 | Implementar centrado de ubicación con permisos y fallos.       |

**Frontend 2**

| ID    | Tarea                                                    |
| ----- | -------------------------------------------------------- |
| F2-07 | Gestos para expandir/contraer Bottom Sheet.              |
| F2-08 | Botones para cambiar entre estados del panel.            |
| F2-09 | Cerrar al tocar fuera, sin impedir interacción con mapa. |
| F2-10 | Adaptar contenido al tipo de selección.                  |
| F2-11 | Hacer funcionales las pestañas.                          |
| F2-12 | Estados vacíos y datos no disponibles.                   |
| F2-13 | Adaptar a diferentes alturas y tamaños de pantalla.      |

**Aceptación:** seleccionar zona o reporte abre el contenido adecuado; filtros y gestos funcionan de forma independiente; no se seleccionan elementos ocultos.

### FASE 3 — Consulta de reportes existentes (paralela)

**Frontend 1**

| ID    | Tarea                                                                                                                 |
| ----- | --------------------------------------------------------------------------------------------------------------------- |
| F1-14 | Marcadores diferenciables y accesibles.                                                                               |
| F1-15 | Selección de marcadores.                                                                                              |
| F1-16 | Prioridad de marcador frente a polígono superpuesto.                                                                  |
| F1-17 | Enfocar reporte seleccionado en el mapa.                                                                              |
| F1-18 | Preparar asociación geográfica de reportes a zonas **según contrato del backend**; sin inventar algoritmo definitivo. |

**Frontend 2**

| ID    | Tarea                                      |
| ----- | ------------------------------------------ |
| F2-14 | Resumen de reporte individual.             |
| F2-15 | Detalle completo de reporte.               |
| F2-16 | Foto, fecha, ubicación y nivel observado.  |
| F2-17 | Estados pendiente, confirmado y rechazado. |
| F2-18 | Visor de fotografía a pantalla completa.   |
| F2-19 | Lista de reportes asociados a una zona.    |
| F2-20 | Estado vacío de reportes.                  |

**Aceptación:** desde un marcador o una zona se pueden consultar reportes simulados y fotos; un reporte pendiente no aparece como inundación confirmada.

### FASE 4 — Creación de reportes y selector de ubicación (paralela)

**Frontend 1**

| ID    | Tarea                                                      |
| ----- | ---------------------------------------------------------- |
| F1-19 | Crear modo/pantalla de selección de ubicación en MapLibre. |
| F1-20 | Pin fijo tipo gota, centrado.                              |
| F1-21 | Mover mapa bajo el pin.                                    |
| F1-22 | Capturar coordenadas correctas del punto indicado.         |
| F1-23 | Opción de usar ubicación actual.                           |
| F1-24 | Confirmar/cancelar selección.                              |
| F1-25 | Devolver coordenadas al formulario por callback.           |

**Frontend 2**

| ID    | Tarea                                                    |
| ----- | -------------------------------------------------------- |
| F2-21 | Modal Reportar inundación.                               |
| F2-22 | Campo de ubicación y solicitud de selector externo.      |
| F2-23 | Carga de foto y vista previa.                            |
| F2-24 | Selector de nivel observado.                             |
| F2-25 | Descripción opcional.                                    |
| F2-26 | Validaciones de campos obligatorios y fotografía.        |
| F2-27 | Cierre descartando datos no enviados.                    |
| F2-28 | Servicio de envío mock con interfaz sustituible.         |
| F2-29 | Carga, éxito tras respuesta y confirmación.              |
| F2-30 | Errores de envío sin perder datos mientras siga abierto. |

**Aceptación:** flujo completo con mock: abrir formulario → seleccionar ubicación → conservar otros campos → adjuntar foto → enviar → éxito; cerrar sin enviar descarta formulario.

### FASE 5 — Integración con backend (coordinada)

| ID     | Responsable | Tarea                                                               |
| ------ | ----------- | ------------------------------------------------------------------- |
| F1-26  | F1          | Conectar lectura real de zonas de riesgo.                           |
| F1-27  | F1          | Conectar lectura real de zonas inundadas.                           |
| F1-28  | F1          | Refrescar capas y manejar carga/error/datos ausentes.               |
| F1-29  | F1          | Conectar lectura/actualización de marcadores de reportes.           |
| F2-31  | F2          | Consultar información detallada de zonas.                           |
| F2-32  | F2          | Consultar reportes y estados.                                       |
| F2-33  | F2          | Conectar envío real del formulario.                                 |
| F2-34  | F2          | Conectar subida/almacenamiento de fotografía según backend.         |
| F2-35  | F2          | Actualizar UI tras respuesta de verificación, incluyendo pendiente. |
| INT-01 | Ambos       | Confirmar que un nuevo reporte se refleja en mapa y detalles.       |

**Aceptación:** flujos funcionando con backend real, o bloqueos documentados claramente si falta una API. No marcar como completa la verificación real usando únicamente mocks.

### FASE 6 — Pruebas, integración y entrega (conjunta)

**Frontend 1:** capas, filtros, selección, superposiciones, permisos de geolocalización, precisión del pin, rendimiento móvil.

**Frontend 2:** gestos, pestañas, formularios, fotos, errores, estados vacíos, teclado móvil, accesibilidad básica.

**Ambos:** seleccionar zona → ver detalles; seleccionar reporte → ver foto/estado; crear reporte → elegir ubicación → enviar; comprobar estado verificado o pendiente; reflejar nuevo reporte en mapa; compilar y probar en móvil.

**Aceptación:** demostración end-to-end del MVP sin datos inventados presentados como reales, compilación exitosa y errores controlados.

## 9. Dependencias y paralelismo

```text
FASE 0: contratos, mocks, ramas, compilación
   ├── F1: mapa/capas → filtros/selección → marcadores → selector ubicación
   └── F2: Bottom Sheet → detalles → visor reportes → formulario
                       ↓
              Integración de eventos
                       ↓
           Integración de API backend
                       ↓
             Pruebas end-to-end
```

- Las fases 1–4 pueden ejecutarse en paralelo después de la fase 0.
- F2 puede desarrollar Bottom Sheet y formulario con mocks sin esperar a MapLibre.
- F1 puede desarrollar selección y coordenadas sin implementar tarjetas ni formulario.
- Integrar en hitos pequeños: **mapa + panel**, **marcadores + detalle**, **selector + formulario**, **servicios + backend**.
- No bloquear todo el trabajo por elevación o superficie si backend aún no las entrega.

## 10. Git y propiedad de archivos

Ramas recomendadas:

- `main`: versión estable.
- `develop`: integración y pruebas.
- `feature/map`: trabajo F1.
- `feature/ui-reports`: trabajo F2.

Crear ramas de funcionalidades desde el mismo commit de `develop` después de fase 0. Integrar mediante Pull Requests pequeños, revisar conflictos y ejecutar `npm run build` (y lint/tests si existen). Sincronizar con `develop` con frecuencia.

| Área                                                   | Responsable                      |
| ------------------------------------------------------ | -------------------------------- |
| `features/map/`                                        | F1                               |
| `features/risk-zones/`                                 | F1                               |
| `features/zone-details/`                               | F2                               |
| `features/reports/` (UI, formularios y servicios)      | F2                               |
| `layouts/`                                             | F2                               |
| `app/App.tsx`                                          | F1, **solo durante integración** |
| `types/`, `mocks/`, `components/ui/`, `lib/`, `hooks/` | Compartido, cambios coordinados  |
| `package.json`, lockfile, configuración de Vite/TS     | Cambios coordinados              |

**Evitar conflictos:** no modificar carpetas ajenas; no redefinir tipos comunes; no crear un segundo mapa; no mezclar lógica de dominio del backend con la UI; acordar cambios compartidos antes de editarlos.

## 11. Checklist de aceptación del MVP

- [ ] Zonas de riesgo visibles y distinguibles de zonas inundadas.
- [ ] Riesgo histórico no confundido con inundación actual.
- [ ] Estado confirmado/por confirmar/sin detección representado correctamente.
- [ ] Tres filtros independientes funcionando.
- [ ] Selección de zona o reporte abre información correcta.
- [ ] Bottom Sheet compacto, resumen y expandido; gestos y cierre.
- [ ] Información y reportes asociados disponibles; estados vacíos correctos.
- [ ] Fotografías visibles y ampliables.
- [ ] Formulario anónimo con ubicación, fotografía y nivel observado obligatorios.
- [ ] Selector de ubicación preciso y retorno al formulario sin perder campos.
- [ ] Cerrar formulario descarta datos; error de envío permite reintentar.
- [ ] Confirmación de envío solo después de éxito del backend.
- [ ] Reportes pendientes no confirman zonas inundadas.
- [ ] Verificación automática real, si backend/API ofrece evidencia suficiente.
- [ ] Datos de elevación/superficie opcionales sin valores inventados.
- [ ] Nuevo reporte visible tras refresco/actualización.
- [ ] Pruebas en móvil y `npm run build` exitoso.

## 12. Riesgos y decisiones pendientes

| Tema                                                         | Responsable            | Tratamiento mientras esté pendiente                                    |
| ------------------------------------------------------------ | ---------------------- | ---------------------------------------------------------------------- |
| API de niveles de agua: cobertura, precisión y actualización | Backend                | Mock explícito; no afirmar confirmación real.                          |
| API de elevación y proximidad a ríos                         | Backend                | Campos opcionales; riesgo no determinado si faltan datos.              |
| Criterios de clasificación de riesgo                         | Backend                | Visualizar valores recibidos; no calcular en frontend.                 |
| Reglas y evidencia de rechazo de reportes                    | Backend                | Mantener pendiente cuando no hay evidencia suficiente.                 |
| Endpoints y esquemas definitivos                             | Backend + coordinación | Contratos provisionales versionados y adaptadores.                     |
| Almacenamiento de fotografías                                | Backend                | Vista previa local; subida real cuando exista endpoint.                |
| Geometría de zonas inundadas                                 | Backend                | GeoJSON mock; no inferir polígonos reales.                             |
| Asociación reporte-zona                                      | Backend                | Preparar UI por IDs; no suponer que todo reporte pertenece a una zona. |
| Fecha y fuente de actualización                              | Backend                | Mostrar solo datos presentes.                                          |

## 13. Instrucciones operativas para OpenCode

**Leer este archivo completo antes de implementar cualquier tarea.**

1. **Inspecciona primero el repositorio** y reporta archivos relevantes, scripts, dependencias y estado actual. No asumas que existen rutas o componentes de este documento.
2. **Trabaja únicamente en las tareas que el usuario indique por ID**, para el rol F1 o F2 correspondiente. No avances automáticamente a otras fases.
3. Antes de codificar, resume: objetivo, archivos a crear/modificar, dependencias, contratos usados y criterios de aceptación.
4. **Respeta la propiedad de carpetas.** Si una tarea exige cambiar `App.tsx`, tipos compartidos, configuración o archivos de otro rol, explica la necesidad y solicita autorización.
5. Usa **TypeScript**, tipos estrictos y componentes pequeños; no dupliques lógica, contratos ni clientes HTTP.
6. Mantén datos de ejemplo claramente identificados como **mocks**. No presentes zonas o inundaciones ficticias como información real.
7. No inventes URLs de API, claves, credenciales, endpoints, contratos definitivos ni algoritmos geográficos. Deja adaptadores y TODOs documentados cuando backend no haya decidido.
8. Distingue siempre **riesgo**, **inundación actual** y **verificación de reportes**.
9. No marques un reporte como rechazado solo porque la API indique valores normales o no tenga cobertura.
10. No implementes rutas alternativas, autenticación, simulación de lluvia ni funciones fuera del MVP.
11. Conserva el comportamiento y los estilos existentes que ya funcionan; evita refactorizaciones masivas no solicitadas.
12. Implementa estados de carga/error y validaciones cuando correspondan, aunque no existan pantallas Figma específicas.
13. Al terminar cada tarea, ejecuta los scripts disponibles de validación, preferentemente `npm run build`, y reporta resultados reales.
14. Entrega un resumen con archivos cambiados, comportamiento implementado, pruebas realizadas, bloqueos y **siguiente tarea sugerida**, sin ejecutarla.
15. Nunca realices commits, pushes o merges sin que el usuario lo solicite expresamente.

### Plantilla para pedir una tarea a OpenCode

```text
Lee URBANGO_FLOOD_PLAN_DESARROLLO.md y revisa el estado actual del repositorio.
Rol asignado: [Frontend 1 / Frontend 2].
Fase: [número].
Tarea(s): [IDs exactos, por ejemplo F1-02 y F1-04].

Implementa exclusivamente esas tareas y respeta los límites de propiedad
establecidos en el plan. Antes de cambiar código, indica qué archivos
modificarás y qué contratos utilizarás. No inventes endpoints ni datos reales.
Al terminar, ejecuta las verificaciones disponibles y resume cambios,
pruebas, bloqueos y el siguiente paso. No hagas commit ni push.
```

## 14. Orden de arranque recomendado

1. F1 inspecciona repositorio y prepara una propuesta de contratos (P0-01, P0-02).
2. Ambos revisan contratos, callbacks y mocks (P0-02 a P0-05).
3. F1 consolida cambios de fase 0 y prepara ramas (P0-06).
4. Ambos verifican compilación (P0-07).
5. F1 inicia F1-01/F1-02; F2 inicia F2-01/F2-02 **en paralelo**.
6. Integrar temprano mapa + Bottom Sheet antes de acumular muchas funcionalidades.

---

**Principio rector:** el mapa representa el territorio; los paneles presentan información; los reportes aportan observaciones ciudadanas; el backend valida y proporciona el estado. Las cuatro partes deben comunicarse mediante contratos explícitos y no invadir responsabilidades ajenas.
