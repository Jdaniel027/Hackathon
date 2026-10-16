# Convenciones de código — UrbanGO Flood

- TypeScript estricto; no usar `any` sin excepción documentada.
- Componentes funcionales de React, PascalCase; variables y funciones camelCase.
- Respetar convenciones y alias ya configurados; no introducir `@/` si no existe.
- Funciones pequeñas, props y respuestas de servicios tipadas; reutilizar componentes.
- Mantener lógica de dominio/verificación en backend; la UI solo representa estados recibidos.
- Datos ficticios exclusivamente en `mocks/`, etiquetados como simulados.
- Manejar loading, error, vacío, permisos de geolocalización y datos nulos.
- MapLibre: limpiar listeners, controles y recursos; evitar recrear mapa innecesariamente.
- Accesibilidad móvil: etiquetas, foco, contraste y objetivos táctiles.
- No alterar estilos, tokens, carpetas o componentes ajenos a la tarea.
- No instalar paquetes ni cambiar contratos compartidos sin acuerdo.
- Ejecutar scripts existentes (`build`, `lint`, tests, typecheck si están disponibles) y reportar resultados reales.
- No realizar commit, push, merge ni cambio de rama sin autorización.
