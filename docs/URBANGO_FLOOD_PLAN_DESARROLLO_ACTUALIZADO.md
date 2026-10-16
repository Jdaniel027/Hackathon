# Plan maestro de desarrollo del MVP

> Documento de referencia para el equipo y OpenCode. Revisión: 16 de octubre de 2026.
>
> **Estado:** reglas de producto acordadas; contratos y endpoints provisionales hasta validación con backend. **Antes de implementar, inspeccionar el repositorio.** Este documento no afirma que las tareas ya estén terminadas.

## 1. Objetivo y alcance

UrbanGO Flood es una aplicación web **mobile-first** para visualizar áreas susceptibles a inundarse, identificar áreas con inundación **confirmada** y recibir reportes ciudadanos con fotografía. El mapa ocupa la pantalla principal.

### MVP obligatorio

1. Mostrar zonas geográficas con **dos estados visuales públicos excluyentes**: **riesgo por huracán (amarillo)** e **inundada (rojo)**.
2. Cambiar el color y el contenido informativo de una zona cuando el backend confirme una transición de estado; actualizar también cuando confirme el fin de la inundación.
3. Ofrecer dos filtros independientes: **Zonas de riesgo por huracán** y **Zonas inundadas**; cada zona aparece en **solo uno** según su estado actual.
4. Mostrar información contextual de zonas y reportes **confirmados** asociados, cuando existan, mediante un Bottom Sheet.
5. Permitir enviar reportes anónimos con ubicación, fotografía y nivel observado obligatorios; descripción opcional.
6. Procesar/verificar reportes desde backend con evidencia externa suficiente cuando sea posible; no exponer reportes pendientes ni rechazados en el mapa público.
7. Ofrecer mapa, geolocalización, selección de zona, panel de detalles, selector de ubicación y formulario adaptados a móvil.

### Fuera del MVP

- Cuentas/autenticación; rutas alternativas y recomendaciones de navegación; simulación manual de lluvia; capa de lluvia en tiempo real; notificaciones push; panel administrativo.
- Capa de marcadores públicos de reportes, filtro de reportes y selección de reportes como entidades independientes del mapa.

**No ampliar alcance sin acuerdo del equipo.**

## 2. Tecnologías y estado conocido

- Frontend: **React + Vite + TypeScript**.
- Mapa: **MapLibre GL JS**, geometrías **GeoJSON**.
- Diseño: referencia **Figma**, enfoque mobile-first, mapa a pantalla completa.
- Arquitectura: organización por funcionalidades (_feature-based_).
- Backend: equipo separado para clasificación de zonas, APIs externas, verificación, persistencia, fotografías y contratos de endpoints.
- Se han realizado avances en mapa y GeoJSON; **inspeccionar el repositorio antes de marcar tareas completadas o reescribir código**.

## 3. Reglas del dominio

### 3.1 Zona geográfica y estado visual

Cada zona tiene una identidad y una geometría GeoJSON. Para el MVP, el backend proporciona su **estado visual público**:

- `at_risk`: **amarillo**; zona de riesgo por **huracán** (detectado por backend/fuente meteorológica), sin inundación actual confirmada. Nunca se asigna por reportes ciudadanos.
- `flooded`: **rojo**; inundación actual confirmada con evidencia suficiente; puede provenir de huracán o de reportes ciudadanos confirmados.

**Una misma zona no se dibuja simultáneamente amarilla y roja.** Si cambia de `at_risk` a `flooded`, conserva su identidad y geometría cuando corresponda, pero cambian el color, la categoría de filtro y el contenido del Bottom Sheet. Al confirmar el fin de la inundación, puede volver a `at_risk` si sigue siendo zona de riesgo.

La clasificación histórica del riesgo (`low | medium | high | unknown`) es **un dato distinto** del estado visual; puede conservarse como información contextual, incluso cuando la zona esté inundada. **No mostrar `unknown` o falta de datos como prueba de que no hay agua.** La ausencia de confirmación no equivale a ausencia de inundación.

**Limitación geográfica importante:** solo pintar de rojo la geometría que el backend considere confirmadamente afectada. Si solo se verifica una porción, el backend deberá suministrar una geometría más precisa o una división de zonas; no pintar todo un polígono como inundado por un reporte puntual.

### 3.2 Reportes ciudadanos y verificación

Reporte anónimo: ubicación, fotografía, nivel observado `low | medium | high`, descripción opcional. Estados internos:

- `pending`: no existe evidencia suficiente para confirmar o descartar.
- `confirmed`: evidencia corroborada según reglas del backend.
- `rejected`: evidencia suficiente para descartar.

Los reportes `pending` y `rejected` **no se publican en el mapa ni en el listado público de una zona**. Los `confirmed` pueden mostrarse **dentro de la pestaña Reportes de una zona asociada**, no como marcadores independientes.

Un reporte confirmado **no cambia por sí solo** una zona a `flooded`: el backend debe confirmar también la inundación actual y el alcance geográfico. Si una API carece de cobertura, está desactualizada o indica valores normales, **no rechazar automáticamente** un reporte: conservar `pending` mientras no exista evidencia concluyente. La aprobación de un reporte solo puede resultar en `flooded`; nunca en `at_risk`, reservado a huracanes.

Al enviar un reporte, mostrar **confirmación privada de recepción solo después de respuesta exitosa**; explicar que está sujeto a verificación. No prometer que será publicado ni que cambiará el mapa inmediatamente.

### 3.3 Origen de la verdad y datos opcionales

El backend decide estado de zona, nivel de riesgo, transiciones, verificación y asociación reporte-zona. El frontend **solo presenta datos y maneja interacciones**. No inferir inundaciones con conteo de reportes, elevación aislada o proximidad a ríos.

Mostrar fecha de actualización, fuente, elevación (m) y superficie (km²) **solo cuando existan**. No reemplazar `null` por `0`. Los datos mock deben estar identificados como tales y no presentarse como evidencia real.

## 4. Experiencia de usuario (referencia Figma)

### 4.1 Mapa

- Mapa a pantalla completa en móvil; menú y botón de ubicación actual; botón flotante de cámara para reportar.
- Dos filtros independientes: **Huracán (amarillo)** e **Inundadas (rojo)**. Una zona que cambia de estado debe salir del filtro anterior y aparecer en el nuevo.
- Seleccionar un polígono visible abre el Bottom Sheet con la información de esa zona.
- Resaltar zona seleccionada; al ocultar su filtro, limpiar selección o cerrar su detalle de forma coherente.
- No renderizar marcadores ni filtros de reportes públicos.
- Manejar permisos denegados, ubicación no disponible, carga, errores y geometrías inválidas.

### 4.2 Bottom Sheet

- Tres niveles: **compacto, resumen, expandido**; expansión por control/gesto y cierre sin bloquear permanentemente el mapa.
- Contenido contextual para zona `at_risk` o `flooded`; actualizarlo al cambiar el estado de la zona seleccionada.
- Pestañas **Información** y **Reportes**. La segunda muestra únicamente reportes confirmados asociados; si no hay, indicar **“No hay reportes confirmados disponibles para esta zona”**.
- Fotografías ampliables a pantalla completa; campos ausentes con “Sin datos” cuando corresponda.
- Evitar mensajes ambiguos como “Inundación sin confirmar” en una zona amarilla; usar “Sin inundación actual confirmada” si es pertinente, sin sugerir seguridad absoluta.

### 4.3 Crear reporte

1. Abrir modal **Reportar inundación** desde el botón flotante.
2. Seleccionar ubicación mediante mapa móvil con pin fijo tipo gota; confirmar coordenadas.
3. Volver al formulario **sin perder los demás campos**.
4. Adjuntar y previsualizar fotografía (diseño: JPG/PNG, máximo 10 MB; validar límites con backend).
5. Seleccionar nivel observado: bajo, medio o alto; descripción opcional.
6. Mostrar aviso **“No te expongas para tomar una fotografía”**.
7. Enviar, indicar carga y mostrar éxito **solo después de respuesta exitosa del backend**; mensaje de recepción y verificación pendiente.
8. Al cerrar sin enviar, descartar borrador; ante error mientras sigue abierto, conservarlo para reintentar.

## 5. Responsabilidades

### Frontend 1 (F1): mapa y geografía

- MapLibre, fuentes/capas GeoJSON, estilos amarillo/rojo y actualización de estado sin recrear el mapa.
- Dos filtros, selección/resaltado de polígonos, controles, geolocalización y selector de ubicación.
- Adaptación de datos geográficos del backend y carga/error/refresco.
- Coordinación de integración en `App.tsx` y rama `develop`.

**No implementar:** Bottom Sheet, formulario, galerías ni lógica de verificación. **No implementar marcadores de reportes.**

### Frontend 2 (F2): paneles y reportes

- Bottom Sheet, estados, gestos, tarjetas, pestañas y detalles de zona.
- Listado de reportes confirmados asociados, fotos y visor.
- Formulario, validación, envío y mensajes de éxito/error; servicios de reportes.

**No implementar:** otro mapa, capas GeoJSON, selección de polígonos o geolocalización propia de MapLibre.

### Backend

- Clasificar zonas y suministrar estado visual `at_risk | flooded`, geometrías confirmadas y cambios de estado.
- Investigar y conectar fuentes de elevación, agua e historial, según disponibilidad real.
- Persistir y verificar reportes, fotos y asociaciones geográficas; exponer **solo confirmados** en consultas públicas de reportes por zona.
- Definir endpoints, autenticidad de evidencia, errores, fechas de actualización y reglas de retorno a riesgo.

**Pendientes de acordar:** endpoints, esquemas definitivos, cobertura de APIs, granularidad de polígonos, refresco, almacenamiento de fotos y metodología de verificación.

## 6. Estructura propuesta del repositorio

```text
src/
├── app/
│   ├── App.tsx                 # Integración coordinada por F1
│   └── providers/              # Compartido
├── components/
│   └── ui/                     # Compartido
├── features/
│   ├── map/                    # F1: MapLibre, polígonos, controles, selector
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   ├── risk-zones/             # F1: adaptación/visualización de zonas
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   ├── zone-details/           # F2: Bottom Sheet y detalles
│   │   ├── components/
│   │   └── hooks/
│   └── reports/                # F2: formulario, fotos, servicios
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types/
├── layouts/                    # F2: composición visual
├── services/                   # F1: datos geográficos / cliente acordado
├── hooks/                      # Compartido
├── types/                      # Contratos compartidos
├── lib/                        # Utilidades compartidas
└── mocks/                      # Ejemplos claramente simulados
```

**No crear/mover carpetas solo por ajustarse al diagrama:** respetar la estructura funcional existente. Evitar clientes HTTP duplicados.

## 7. Contratos provisionales para desarrollo paralelo

> Propuesta para acordar en Fase 0, **no afirmación de contratos existentes ni definitivos del backend**. Revisar librerías instaladas antes de importar tipos GeoJSON.

```ts
type ZoneStatus = "at_risk" | "flooded";
type RiskLevel = "low" | "medium" | "high" | "unknown";
type ReportStatus = "pending" | "confirmed" | "rejected";
type ObservedLevel = "low" | "medium" | "high";
type Coordinates = { latitude: number; longitude: number };

type MapSelection = { type: "zone"; id: string } | null;
type LayerVisibility = { riskZones: boolean; floodedZones: boolean };

type Zone = {
  id: string;
  name: string;
  status: ZoneStatus;
  riskLevel?: RiskLevel | null;
  geometry: unknown; // sustituir por GeoJSON Polygon | MultiPolygon
  elevationMeters?: number | null;
  areaKm2?: number | null;
  updatedAt?: string | null;
  source?: string | null;
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

**Nota:** `CitizenReport` representa el modelo interno. Los endpoints públicos por zona deben entregar únicamente reportes confirmados; el frontend puede filtrar defensivamente, pero **la privacidad debe imponerse en backend**. El estado de la zona y el de los reportes son distintos.

**Interacciones acordadas:**

- `MapView` recibe zonas y visibilidad; emite `onSelect(MapSelection)`; **no controla Bottom Sheet**.
- `App` o controlador mantiene `selection`, `activePanel`, `layerVisibility` y modo de ubicación.
- `ZoneDetails` recibe zona seleccionada y reportes confirmados asociados, con callbacks de cierre y navegación.
- `LocationPicker` emite `onConfirm(Coordinates)` y `onCancel()`.
- `ReportForm` conserva sus campos al abrir/cerrar el selector y usa un servicio intercambiable mock/real.
- Después del envío, **no crear marcador público**; las zonas solo cambian si el backend devuelve después un nuevo estado confirmado.
- Tipos compartidos se definen una sola vez; adaptar al contrato real sin duplicarlos.

## 8. Fases de desarrollo y tareas

### FASE 0 — Preparación conjunta (bloqueante)

| ID    | Responsable | Tarea                                                                                                     |
| ----- | ----------- | --------------------------------------------------------------------------------------------------------- |
| P0-01 | F1          | Inspeccionar repo, dependencias, estructura y avances; preservar mapa funcional.                          |
| P0-02 | Ambos       | Acordar `Zone`, `ZoneStatus`, `CitizenReport`, coordenadas y visibilidad.                                 |
| P0-03 | Ambos       | Acordar props, callbacks, selección y transición de zona.                                                 |
| P0-04 | Ambos       | Preparar mocks: riesgo, inundada, transición, datos ausentes y reportes internos/confirmados.             |
| P0-05 | Ambos       | Documentar propiedad de archivos y puntos de integración.                                                 |
| P0-06 | F1          | Verificar/preparar `develop`, `feature/map`, `feature/ui-reports` desde la misma base sin perder avances. |
| P0-07 | Ambos       | Ejecutar aplicación y compilación con éxito.                                                              |

**Aceptación:** ambos importan contratos/mocks comunes sin duplicación, compilan y pueden trabajar en paralelo. Acordar cuándo consolidar la base; OpenCode no hace commits sin autorización.

### FASE 1 — Mapa e interfaz base (paralela)

| ID    | Responsable | Tarea                                                                |
| ----- | ----------- | -------------------------------------------------------------------- |
| F1-01 | F1          | Ajustar mapa a pantalla completa móvil según Figma.                  |
| F1-02 | F1          | Renderizar polígonos GeoJSON de zonas con ID estable.                |
| F1-03 | F1          | Aplicar amarillo `at_risk` y rojo `flooded`, sin duplicar polígonos. |
| F1-04 | F1          | Actualizar color/categoría al cambiar el estado mock de una zona.    |
| F1-05 | F1          | Crear controles flotantes y estados básicos del mapa.                |
| F2-01 | F2          | Crear componentes/estilos reutilizables según Figma.                 |
| F2-02 | F2          | Crear Bottom Sheet reutilizable.                                     |
| F2-03 | F2          | Crear vistas compacto, resumen y expandido.                          |
| F2-04 | F2          | Crear encabezados, tarjetas e indicadores de zona.                   |
| F2-05 | F2          | Crear vistas de información para riesgo e inundación.                |
| F2-06 | F2          | Crear pestañas Información y Reportes.                               |

**Aceptación:** mapa con zonas amarillas/rojas y transición mock; paneles independientes con datos simulados; sin marcadores de reportes.

### FASE 2 — Interacciones principales (paralela)

| ID    | Responsable | Tarea                                                            |
| ----- | ----------- | ---------------------------------------------------------------- |
| F1-06 | F1          | Menú con exactamente dos filtros de zonas.                       |
| F1-07 | F1          | Alternar zonas `at_risk` independientemente.                     |
| F1-08 | F1          | Alternar zonas `flooded` independientemente.                     |
| F1-09 | F1          | Seleccionar polígonos visibles y emitir ID.                      |
| F1-10 | F1          | Resaltar selección y limpiarla al cerrar/ocultar/cambiar estado. |
| F1-11 | F1          | Centrar ubicación con permisos y errores.                        |
| F2-07 | F2          | Gestos para expandir/contraer Bottom Sheet.                      |
| F2-08 | F2          | Controles para cambiar estados del panel.                        |
| F2-09 | F2          | Cerrar sin bloquear interacción con el mapa.                     |
| F2-10 | F2          | Adaptar contenido al estado de la zona seleccionada.             |
| F2-11 | F2          | Hacer funcionales las pestañas.                                  |
| F2-12 | F2          | Manejar estados vacíos y campos faltantes.                       |
| F2-13 | F2          | Adaptar a distintos tamaños y teclado móvil.                     |

**Aceptación:** seleccionar zona abre su panel, filtros funcionan, elementos ocultos no se seleccionan, transición actualiza el panel.

### FASE 3 — Consulta de reportes confirmados (paralela)

| ID    | Responsable | Tarea                                                                       |
| ----- | ----------- | --------------------------------------------------------------------------- |
| F1-12 | F1          | Mantener selección de zona durante actualización de datos si sigue visible. |
| F1-13 | F1          | Limpiar/ajustar selección cuando la zona cambia de filtro o desaparece.     |
| F1-14 | F1          | Preparar actualización/refresco de datos de zonas con mocks.                |
| F2-14 | F2          | Listar reportes **confirmados** asociados a la zona.                        |
| F2-15 | F2          | Mostrar fecha, foto, ubicación, nivel observado y descripción disponible.   |
| F2-16 | F2          | Visor de fotografías a pantalla completa.                                   |
| F2-17 | F2          | Estado vacío: no hay reportes confirmados disponibles.                      |
| F2-18 | F2          | Evitar exposición pública de `pending` y `rejected` en la UI.               |

**Aceptación:** desde una zona se consultan únicamente reportes confirmados; no hay marcadores ni selección individual de reportes en el mapa.

### FASE 4 — Creación de reportes y ubicación (paralela)

| ID    | Responsable | Tarea                                                         |
| ----- | ----------- | ------------------------------------------------------------- |
| F1-15 | F1          | Modo de selección de ubicación sobre MapLibre.                |
| F1-16 | F1          | Pin fijo centrado y mapa móvil debajo.                        |
| F1-17 | F1          | Capturar coordenadas del centro indicado.                     |
| F1-18 | F1          | Opción de usar ubicación actual.                              |
| F1-19 | F1          | Confirmar/cancelar y devolver coordenadas por callback.       |
| F2-19 | F2          | Modal Reportar inundación.                                    |
| F2-20 | F2          | Campo de ubicación que solicita selector externo.             |
| F2-21 | F2          | Subir/previsualizar fotografía.                               |
| F2-22 | F2          | Selector bajo/medio/alto y descripción opcional.              |
| F2-23 | F2          | Validar obligatorios, tipo y tamaño de foto.                  |
| F2-24 | F2          | Cerrar descartando borrador; conservarlo si falla envío.      |
| F2-25 | F2          | Servicio mock sustituible por backend.                        |
| F2-26 | F2          | Carga, errores y confirmación privada tras respuesta exitosa. |
| F2-27 | F2          | Mantener datos del formulario al usar selector de ubicación.  |

**Aceptación:** formulario completo con mock; el envío no genera marcador ni cambia automáticamente el color de zona.

### FASE 5 — Integración con backend (coordinada)

| ID     | Responsable | Tarea                                                                                                       |
| ------ | ----------- | ----------------------------------------------------------------------------------------------------------- |
| F1-20  | F1          | Consultar zonas y geometrías reales según endpoint acordado.                                                |
| F1-21  | F1          | Aplicar estados confirmados y transiciones de color/categoría.                                              |
| F1-22  | F1          | Refrescar datos y manejar carga/error/ausencia de cobertura.                                                |
| F2-28  | F2          | Consultar detalle de zona.                                                                                  |
| F2-29  | F2          | Consultar únicamente reportes confirmados asociados.                                                        |
| F2-30  | F2          | Enviar reportes reales y fotografías según contrato.                                                        |
| F2-31  | F2          | Mostrar recepción y estado privado de verificación si backend lo devuelve.                                  |
| INT-01 | Ambos       | Confirmar que un envío pendiente no aparece públicamente.                                                   |
| INT-02 | Ambos       | Confirmar que solo una actualización verificada de backend cambia la zona de amarillo a rojo (o viceversa). |

**Aceptación:** integración real o bloqueos documentados; no declarar verificación real cuando solo hay mocks.

### FASE 6 — Pruebas y entrega

- **F1:** colores, filtros, selección, transiciones, geometría real, permisos, ubicación y rendimiento móvil.
- **F2:** Bottom Sheet, pestañas, fotos, formularios, validaciones, estados vacíos, teclado y accesibilidad.
- **Ambos:** zona amarilla → backend confirma inundación → roja con nuevo detalle; inundación termina → amarillo cuando corresponda; reporte enviado → acuse privado sin publicación automática; consulta pública solo de reportes confirmados.
- Compilación y pruebas en móvil; errores controlados; mocks claramente identificados.

## 9. Dependencias y paralelismo

```text
FASE 0: contratos + mocks + ramas + build
  ├─ F1: mapa y estados → filtros/selección → ubicación
  └─ F2: Bottom Sheet → detalles/reportes confirmados → formulario
                    ↓
         Integración de callbacks
                    ↓
           Integración backend
                    ↓
          Pruebas end-to-end
```

Las fases 1–4 pueden avanzar en paralelo tras Fase 0. Integrar pronto **mapa + panel**, luego **zona + reportes confirmados**, luego **selector + formulario**, finalmente **backend**. No bloquear UI por elevación o área si son datos opcionales.

## 10. Git y propiedad de archivos

- `main`: estable; `develop`: integración; `feature/map`: F1; `feature/ui-reports`: F2.
- Verificar ramas existentes y partir de una base compartida; no sobrescribir avances actuales.
- PRs pequeños; sincronizar `develop`; ejecutar `npm run build` y lint/tests si existen.

| Área                                                      | Responsable                     |
| --------------------------------------------------------- | ------------------------------- |
| `features/map/`, `features/risk-zones/`                   | F1                              |
| `features/zone-details/`, `features/reports/`, `layouts/` | F2                              |
| `app/App.tsx`                                             | Integración coordinada por F1   |
| `types/`, `mocks/`, `components/ui/`, `lib/`, `hooks/`    | Compartido, cambios coordinados |
| Dependencias, lockfile y configuración                    | Compartido, cambios coordinados |

No crear un segundo mapa, no duplicar contratos, no modificar archivos ajenos sin acuerdo, no inventar verificación frontend.

## 11. Checklist de aceptación del MVP

- [ ] Una zona tiene un solo estado visual público: amarillo (riesgo por huracán) o rojo (inundada).
- [ ] La transición confirmada actualiza color, filtro y contenido del Bottom Sheet.
- [ ] El rojo solo cubre geometría confirmada; no se extiende a un área por un punto aislado.
- [ ] Dos filtros independientes, sin capa de reportes.
- [ ] Polígonos ocultos no son seleccionables.
- [ ] Bottom Sheet compacto/resumen/expandido, gestos y cierre.
- [ ] Información de zona y reportes **confirmados** asociados.
- [ ] Reportes pendientes y rechazados no se exponen públicamente.
- [ ] Fotos visibles y ampliables; estados vacíos correctos.
- [ ] Formulario anónimo con ubicación, foto y nivel observado obligatorios.
- [ ] Selector de ubicación preciso; conserva datos al volver.
- [ ] Cierre descarta borrador; error de envío permite reintentar.
- [ ] Éxito de envío solo tras respuesta real y mensaje privado de verificación.
- [ ] Un envío no crea marcador público ni cambia una zona automáticamente.
- [ ] Backend determina clasificación, geometría y verificación.
- [ ] Campos opcionales sin valores inventados; mocks identificados.
- [ ] Pruebas en móvil y `npm run build` exitoso.

## 12. Riesgos y decisiones pendientes

| Tema                                                 | Responsable     | Tratamiento temporal                                                                |
| ---------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------- |
| Fuente de niveles de agua, cobertura y actualización | Backend         | Mocks explícitos; no afirmar confirmación real.                                     |
| Criterios de riesgo e inundación                     | Backend         | Mostrar estado recibido; no inferir en frontend.                                    |
| Inundación parcial de un polígono                    | Backend         | Exigir geometría confirmada más precisa; no pintar zona completa sin evidencia.     |
| Retorno de rojo a amarillo                           | Backend         | Solo tras confirmación del fin y riesgo persistente.                                |
| Falta de datos / estado desconocido                  | Backend + ambos | No confundir con seguridad; definir tratamiento de zonas sin clasificación pública. |
| Endpoints y esquema definitivos                      | Backend + ambos | Contratos provisionales versionados y adaptadores.                                  |
| Almacenamiento y límites de fotos                    | Backend         | Vista previa local; validar contrato antes de envío real.                           |
| Asociación reporte-zona                              | Backend         | Solo asociaciones confirmadas en consulta pública.                                  |
| Frecuencia de refresco                               | Backend + F1    | Definir mecanismo; no prometer tiempo real sin soporte.                             |
| Fuente y fecha de actualización                      | Backend         | Mostrar únicamente valores existentes.                                              |

## 13. Instrucciones operativas para OpenCode

**Leer este archivo completo antes de cualquier tarea.**

1. Inspecciona repo, dependencias, scripts, estructura y avances; no asumas rutas existentes.
2. Implementa **solo los IDs solicitados** para F1/F2; no avances automáticamente.
3. Antes de editar, indica objetivo, archivos, contratos, dependencias y aceptación.
4. Respeta propiedad de carpetas; solicita acuerdo para modificar archivos compartidos o ajenos.
5. TypeScript estricto, componentes pequeños, sin duplicar contratos/clientes HTTP.
6. Los mocks deben estar marcados; no representar datos ficticios como reales.
7. No inventar endpoints, claves, geometrías, reglas de verificación ni algoritmos de riesgo.
8. Distinguir estado público de zona, nivel histórico de riesgo y estado interno del reporte.
9. Nunca mostrar reportes pendientes/rechazados en UI pública ni crear marcadores de reportes.
10. Solo el backend confirma cambios de estado; no cambiar una zona al enviar un reporte.
11. No implementar rutas alternativas, autenticación, simulación o funcionalidades fuera del MVP.
12. Preservar código funcional; evitar refactorizaciones masivas no solicitadas.
13. Implementar carga/error y validar entradas cuando corresponda.
14. Al finalizar, ejecutar scripts disponibles (preferir `npm run build`) y reportar resultados reales.
15. Resumir archivos, comportamiento, pruebas, bloqueos y siguiente ID sugerido **sin ejecutarlo**.
16. **No realizar commits, pushes ni merges sin petición expresa.**

### Plantilla de tarea

```text
Lee URBANGO_FLOOD_PLAN_DESARROLLO_ACTUALIZADO.md y revisa el estado actual del repositorio.
Rol: [Frontend 1 / Frontend 2].
Fase: [número].
Tareas: [IDs exactos].

Implementa exclusivamente esas tareas y respeta la propiedad de archivos.
Antes de codificar, indica archivos y contratos que utilizarás.
No inventes datos reales, endpoints ni verificaciones.
Al terminar ejecuta las verificaciones disponibles, resume cambios,
pruebas, bloqueos y siguiente paso. No hagas commit ni push.
```

## 14. Orden recomendado de arranque

1. F1 inspecciona avances existentes (`P0-01`) y propone contratos (`P0-02`).
2. Ambos acuerdan callbacks, mocks y propiedad de archivos (`P0-02` a `P0-05`).
3. F1 verifica ramas/base compartida (`P0-06`); ambos compilan (`P0-07`).
4. F1 retoma las tareas pendientes de `F1-01` a `F1-05` **sin repetir lo que ya funciona**.
5. F2 inicia `F2-01` a `F2-03` en paralelo.
6. Integrar mapa + Bottom Sheet temprano; después avanzar por fases.

---

**Principio rector:** el mapa muestra únicamente el estado público confirmado de las zonas; los paneles explican la zona y sus reportes confirmados; la ciudadanía aporta observaciones; el backend verifica y decide el estado geográfico. Los módulos se comunican mediante contratos explícitos.
