# Arquitectura aprobada

## Stack inicial (confirmar con el equipo)
- Next.js App Router + React + TypeScript.
- Tailwind CSS para estilos.
- Backend externo consumido por HTTP; no duplicar lógica del backend en frontend.
- No agregar gestión global de estado salvo necesidad demostrada.

## Organización
- `src/app/`: rutas, layouts y composición de páginas.
- `src/components/ui/`: primitivas reutilizables.
- `src/components/layout/`: navegación y estructura visual.
- `src/features/<feature>/`: componentes y lógica específicos de una función.
- `src/services/`: llamadas HTTP.
- `src/types/`: tipos compartidos cuando aplique.
- `src/lib/`: utilidades puras y configuración.
- `src/hooks/`: hooks reutilizables.

## Reglas
- Páginas delgadas: la lógica de una funcionalidad vive en `features/`.
- Reutilizar antes de crear. No mover carpetas sin aprobación.
- Un único cliente HTTP y URL base desde variables de entorno.
- Datos simulados solo en mocks explícitos, nunca disfrazados de datos reales.
- Mantener límites de Server y Client Components; `use client` solo cuando sea necesario.

## Cambios arquitectónicos
Registrar propuesta, motivo, impacto y aprobación en `DECISIONS.md` antes de implementar.
