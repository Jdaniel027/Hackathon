# Instrucciones para agentes — Hackathon

## Prioridad de instrucciones
1. Requisitos del reto y reglas del concurso.
2. Este archivo y las decisiones aprobadas en `docs/DECISIONS.md`.
3. `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/CODING_STANDARDS.md` y `docs/API_CONTRACT.md`.
4. La tarea asignada en `docs/TASKS.md`.

Si hay contradicciones, detente y pregunta al responsable; no decidas silenciosamente.

## Antes de editar
- Lee `docs/PROJECT.md`, `docs/DECISIONS.md` y los documentos pertinentes a la tarea.
- Inspecciona los archivos existentes. Reutiliza componentes y patrones.
- Describe en 3-5 líneas qué archivos modificarás y por qué.
- No modifiques código fuera del alcance de la tarea.

## Reglas no negociables
- No cambies stack, arquitectura, estructura de carpetas, librerías de UI, colores, tipografía ni contratos de API sin autorización humana.
- No agregues dependencias sin justificar y solicitar aprobación.
- No refactorices módulos ajenos a la tarea.
- No inventes endpoints ni campos; si faltan, usa mocks claramente identificados y registra el supuesto.
- Evita componentes gigantes, duplicación y uso de `any`.
- Mantén la aplicación compilable y prioriza el flujo principal del MVP.
- No incluyas secretos ni credenciales en el código o en documentación.

## Al terminar
- Ejecuta las verificaciones disponibles (`npm run lint`, `npx tsc --noEmit`, `npm run build`) cuando sea viable.
- Resume archivos cambiados, pruebas realizadas, riesgos y supuestos.
- Propón actualizaciones a documentación; no reescribas decisiones aprobadas por tu cuenta.

## Documentos de referencia
- Producto y alcance: `docs/PROJECT.md`
- Arquitectura: `docs/ARCHITECTURE.md`
- Diseño: `docs/DESIGN_SYSTEM.md`
- Código: `docs/CODING_STANDARDS.md`
- Backend: `docs/API_CONTRACT.md`
- Decisiones: `docs/DECISIONS.md`
- Asignaciones: `docs/TASKS.md`
