# Pendientes para integrar el backend

> Lista de integración H + V. No sustituye las tareas ni decisiones aprobadas.
> No ejecutar operaciones de escritura en Supabase compartido sin coordinarlo.

## A cargo de H

- [ ] Alinear con el equipo `API_MANUAL.md` (25 lecturas por zona y 501 temporal de ciclón) y completar las comprobaciones restantes de §7 de `DEVELOPER_H.md` (auditoría de secretos y contrato). Las pruebas, lint, typecheck, Prisma y build pasaron el 16/10/2026; lint conserva la advertencia de `ReporteApi` del módulo de V.
- [ ] Probar los límites reales de rate limiting (global, reportes y admin) sin alterar el entorno compartido: la prueba HTTP anterior los desactivó mediante variables de proceso. Los errores de ruta inexistente, ID de zona no numérico y logging de 501 quedaron corregidos y probados (47/47 pruebas unitarias).

**Prueba HTTP en Supabase (16/10/2026):** se escribieron 1 lectura simulada, 43 riesgos ALTURA y 1 zona adicional sin la coordinación indicada arriba. Se verificaron por ID, fecha y valores y, con autorización posterior del responsable, se eliminaron únicamente esos registros; la zona 1 se restauró a `SIN_DATOS`, `mm1h=0`, `mm24h=0` y su `actualizadoEn` original. Se conservó el riesgo id 1 del seed. No se crearon reportes (Gemini devuelve 501). No repetir escrituras en la BD compartida sin acordarlo.

## A cargo de V (H no modifica estos módulos)

- [ ] Implementar los trabajos de `CronsService.ejecutar(nombre)` para los cuatro nombres
  permitidos. La ruta admin ya valida la API key y delega; hoy la respuesta indica
  `ejecutado: false`. Probar el resultado real y sus fallos al integrar.
- [ ] Acordar la firma y entregar la lógica para `POST /admin/ciclon` que utilice
  `categoria` y `vientoKmh` de `RegistrarCiclonDto`. H conectará la ruta cuando esté
  disponible. Mientras tanto responde **501 `NO_IMPLEMENTADO`** y no escribe datos.
- [ ] Completar/validar EXIF y controles del reporte ciudadano, integración de Gemini,
  pronósticos Conagua/SMN y persistencia de los crons según `DEVELOPER_V.md`.
- [ ] Revisar la advertencia de lint por `ReporteApi` sin usar en `reportes.service.ts`.

## Por acordar con el equipo al integrar

- [ ] Verificar `idEstadoSmn=25` / `idMunSmn=12` con un registro real de Mazatlán en
  Conagua `method=3`; el seed contiene estos **valores provisionales**, pero la BD
  conserva `null`. Solo después, decidir si se vuelve a ejecutar el seed en Supabase.
- [ ] Acordar umbrales de lluvia de Mazatlán y otros municipios con criterio verificable.
  Actualmente se aplican valores por defecto; no tratarlos como alertas oficiales.
- [ ] Sincronizar `API_MANUAL.md` con las **25** lecturas de `GET /zonas/:id` y con el
  **501 temporal** de ciclón antes de actualizar clientes frontend.
- [ ] Decidir cómo identificar en el historial una lectura simulada por
  `POST /admin/simular-lluvia`: ahora se guarda con `fuente: OPEN_METEO`, porque el
  enum no tiene un valor de simulación. No presentarla como dato medido.
- [ ] Configurar `TRUST_PROXY_HOPS` según los proxies reales en despliegue; el valor
  seguro por defecto es 0. Actualizar la guía de despliegue cuando exista infraestructura.
- [ ] Probar manualmente rutas admin contra una base de pruebas con autorización:
  simulación, generación con caja pequeña, riesgo por altura y reintentos. Las pruebas
  automáticas usan mocks; la prueba HTTP del 16/10/2026 escribió en Supabase compartido
  sin coordinación previa y se revirtió (ver registro arriba). Falta una corrida autorizada
  en una base de pruebas aislada, incluidos los reintentos.
- [ ] Evaluar concurrencia en `POST /admin/riesgo-altura/:zonaId`: la deduplicación
  actual evita repeticiones secuenciales, pero peticiones simultáneas podrían crear
  el mismo riesgo sin una restricción única en BD.
- [ ] Confirmar reglas del concurso y alcance final del MVP antes de la demo.
