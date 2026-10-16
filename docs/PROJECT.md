# Producto y MVP — UrbanGO Flood

## Problema
Durante episodios de lluvia e inundación, la población necesita distinguir zonas susceptibles de zonas con inundación actual confirmada sin confundir reportes sin verificar con hechos.

## Usuarios objetivo
Personas que consultan el mapa desde su teléfono y ciudadanos que aportan reportes con fotografía.

## Propuesta de valor
Mapa mobile-first con información de riesgo e inundación corroborada y un canal de reportes ciudadanos sujeto a verificación.

## Flujo demostrable
1. Abrir mapa y filtrar zonas amarillas (riesgo por huracán) y rojas (inundadas).
2. Tocar una zona y consultar su información y reportes confirmados asociados.
3. Abrir formulario, seleccionar ubicación, adjuntar fotografía, indicar nivel y enviar; recibir acuse privado.
4. Cuando backend confirme un cambio de estado, actualizar color, filtro y detalle de la zona.

## MVP
- [ ] Mapa MapLibre/GeoJSON y dos estados visuales excluyentes.
- [ ] Dos filtros independientes, geolocalización y selección de zona.
- [ ] Bottom Sheet compacto/resumen/expandido y reportes confirmados asociados.
- [ ] Formulario anónimo con ubicación, fotografía y nivel observado; descripción opcional.
- [ ] Verificación desde backend cuando haya evidencia suficiente; pendientes no públicos; un reporte aprobado solo genera zona inundada, nunca de riesgo por huracán.
- [ ] Integración con backend y manejo de errores, datos faltantes y carga.

## Fuera de alcance
Rutas alternativas, simulación manual de lluvia, capa de lluvia en tiempo real, autenticación, notificaciones push, panel administrativo y marcadores públicos de reportes.

## Criterios de éxito
Demostración móvil end-to-end sin datos ficticios presentados como reales; cambio amarillo→rojo solo cuando backend lo confirme; build correcto y estados de error controlados.

## Concurso
Reglas sobre código previo, IA, despliegue y servicios externos: **pendientes de verificar**. No inventar restricciones.

## Definiciones pendientes de aprobación
- Persistencia de reportes e imágenes: almacenamiento local en el navegador con límite de 24 h. Ver `DECISIONS.md` D-005 (estado: PROPUESTO).

Fuente de detalle: `URBANGO_FLOOD_PLAN_DESARROLLO_ACTUALIZADO.md`.
