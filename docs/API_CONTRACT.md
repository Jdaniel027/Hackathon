# Contrato de API — UrbanGO Flood

> Documento de coordinación frontend/backend. **Ningún endpoint se considera confirmado todavía.** No inventar rutas, respuestas ni claves.

## Configuración
| Campo | Estado |
|---|---|
| URL base local | Pendiente de backend |
| URL base desplegada | Pendiente de backend |
| Autenticación | MVP anónimo; requisitos técnicos pendientes de backend |
| CORS | Pendiente |
| Formato de errores | Pendiente |
| Carga de fotografías y límites | Pendiente; referencia Figma JPG/PNG hasta 10 MB, por confirmar |
| Frecuencia de actualización de zonas | Pendiente |

## Capacidades necesarias (no son endpoints)
| Operación | Datos esperados conceptualmente | Estado |
|---|---|---|
| Consultar zonas | ID, geometría GeoJSON, `at_risk`/`flooded`, información y fecha/fuente opcionales | Por acordar |
| Consultar detalle de zona | ID, estado y datos contextuales disponibles | Por acordar |
| Consultar reportes confirmados asociados | ID de zona, reportes `confirmed` y fotografías disponibles | Por acordar |
| Crear reporte anónimo | Coordenadas, fotografía, nivel observado, descripción opcional | Por acordar |
| Consultar resultado de verificación, si aplica | `pending`/`confirmed`/`rejected` según autorización | Por acordar |

## Reglas del contrato
- Backend es la fuente de verdad para estado visual de zona, verificación y geometría afectada.
- Un reporte confirmado no vuelve roja una zona por sí mismo.
- No exponer reportes pendientes/rechazados en vistas públicas.
- Una zona solo aparece en uno de los dos filtros, con su estado actual.
- Distinguir valores ausentes de cero; incluir fecha, fuente y cobertura cuando estén disponibles.
- Documentar request/response, errores, paginación, permisos, actualizaciones y ejemplos reales cuando backend los confirme.
- Hasta entonces, trabajar con mocks claramente identificados y adaptadores intercambiables.

## Endpoints aprobados
**Ninguno aún.** Completar junto al backend, no mediante suposiciones del agente.
