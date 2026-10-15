# Registro de decisiones (ADR ligero)

## D-001 — Stack inicial
- Estado: PROPUESTO (pendiente de aprobación del equipo)
- Decisión: Next.js + TypeScript + Tailwind CSS.
- Motivo: herramientas conocidas, velocidad y bajo costo de integración.
- Impacto: mantener un único framework y patrón de rutas.
- Aprobado por: PENDIENTE.

## D-002 — Backend sin usuarios ni JWT
- Estado: APROBADO
- Contexto: el MVP no tiene login ni usuarios; la API es anónima.
- Decisión: eliminar JWT, refresh tokens, cookies, roles, bcrypt y sesiones del molde base. API pública sin autenticación; endpoints `/admin/*` protegidos con header `x-api-key` comparada en tiempo constante contra `ADMIN_API_KEY`.
- Alternativas: JWT sin login (innecesario), API key también para lectura (rompe la búsqueda pública), autenticación por IP (no identifica a nadie).
- Impacto: superficie de ataque menor; sin estado de sesión. Requiere no exponer `ADMIN_API_KEY` en el frontend ni en Git.
- Aprobado por: Responsable del proyecto (confirmación verbal en sesión con agente).
- Fecha: 2026-10-15.
- Documento: `hackaton-backend/docs/ARCHITECTURE.md`.

## D-003 — Rate limiting por IP, agresivo en reportes
- Estado: APROBADO
- Contexto: `POST /reportes` consume Gemini y es anónimo; hay que limitar abuso y costo.
- Decisión: `POST /reportes` = 2 solicitudes por IP cada 15 min; `/admin/*` = 40 cada 15 min (configurable por env para pruebas); resto de API pública = 100 por minuto. Contadores en memoria (una instancia) con `@nestjs/throttler`.
- Alternativas: límite único global (castigaría lecturas), rate limit por usuario (no hay usuarios), Redis desde el MVP (dependencia innecesaria ahora).
- Impacto: usuarios en la misma IP (CGNAT/red) comparten cupo; aceptado para el MVP. Redis lo hará compartido después.
- Aprobado por: Responsable del proyecto (confirmación verbal en sesión con agente).
- Fecha: 2026-10-15.
- Documento: `hackaton-backend/docs/ARCHITECTURE.md` §7.

## D-004 — Alcance geográfico: multi-municipio, demo Mazatlán
- Estado: APROBADO
- Contexto: `IDEA.md` fijaba Ahome/Los Mochis; el interés actual es Mazatlán por la lluvia activa, con Guasave como ejemplo de búsqueda repetida.
- Decisión: arquitectura multi-municipio sin valores codificados. Seed y demo iniciales en **Mazatlán**. Umbrales de lluvia parametrizados por municipio.
- Alternativas: mantener Ahome (desactualizado), fijar solo Mazatlán (limitaría el diseño).
- Impacto: `IDEA.md` queda anotado como alcance geográfico anterior; el esquema ya soporta multi-municipio (`Municipio.idEstadoSmn/idMunSmn`).
- Aprobado por: Responsable del proyecto (confirmación verbal en sesión con agente).
- Fecha: 2026-10-15.
- Documento: `hackaton-backend/docs/ARCHITECTURE.md` §11, nota en `hackaton-backend/docs/IDEA.md`.

## D-005 — Redis como evolución futura, no en el MVP
- Estado: APROBADO
- Contexto: una búsqueda repetida (ej. Guasave/Mazatlán) no debe recomponer la respuesta ni reconsultar todo.
- Decisión: patrón cache-aside en Redis con claves versionadas `mapa:{slug}:v1`, TTL alineado al cron de clima (15 min) e invalidación tras crons/reportes/admin. PostgreSQL sigue siendo la fuente de verdad; si Redis falla, la API responde desde BD. Redis también servirá para rate limiting distribuido cuando haya varias instancias.
- Alternativas: cachear en memoria por proceso (no compartido), cachear en BD (ya es la fuente), Redis obligatorio desde el inicio (dependencia extra sin necesidad demostrada).
- Impacto: diseño con punto de inserción claro (`ZonasService.getMapa`) sin implementar Redis todavía. Variables `REDIS_URL` quedan documentadas pero inactivas.
- Aprobado por: Responsable del proyecto (confirmación verbal en sesión con agente).
- Fecha: 2026-10-15.
- Documento: `hackaton-backend/docs/ARCHITECTURE.md` §10.

## D-006 — Datos externos solo vía crons, no en endpoints de lectura
- Estado: APROBADO
- Contexto: `/mapa` y `/zonas` no deben llamar Open-Meteo, Conagua ni Gemini en la petición.
- Decisión: los proveedores externos se consumen desde `crons` y `reportes`; los endpoints de lectura sirven exclusivamente desde PostgreSQL. La única excepción síncrona es `POST /reportes` (Gemini).
- Alternativas: llamada en línea con caché (más compleja y más frágil en la demo), consultar externos por petición (lento y cuota consumida).
- Impacto: lecturas rápidas y predecibles; los datos se actualizan con la frecuencia del cron. Requiere tolerar datos con hasta 15 min de antigüedad.
- Aprobado por: Responsable del proyecto (confirmación verbal en sesión con agente).
- Fecha: 2026-10-15.
- Documento: `hackaton-backend/docs/ARCHITECTURE.md` §5.

## Plantilla de nueva decisión
### D-XXX — Título
- Estado: PROPUESTO / APROBADO / REEMPLAZADO.
- Contexto:
- Decisión:
- Alternativas:
- Impacto:
- Aprobado por:
- Fecha:

**Regla:** los agentes pueden proponer decisiones, pero no aprobarlas ni sustituir decisiones aprobadas.
