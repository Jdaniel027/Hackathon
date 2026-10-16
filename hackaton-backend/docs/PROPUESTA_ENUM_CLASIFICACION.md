# Propuesta — unificar clasificación de foto con `EstadoZona`

> Autor: DEVELOPER_V · Estado: **NO APROBADA**. El responsable decidió conservar
> `INUNDADO` / `PARCIAL` / `NO_INUNDADO` en API y Prisma el 2026-10-16.
> Se conserva este archivo como historial de la propuesta; el adaptador temporal
> mencionado abajo fue eliminado.
> No modifica contrato ni esquema por sí sola: es una solicitud de cambio.

## 1. Motivo

El clasificador de foto (`GeminiService.clasificarFoto`) devuelve el estado de la vía, que
conceptualmente es el mismo conjunto de valores que `EstadoZona` (`NORMAL` / `PRECAUCION` /
`INUNDADO`, sin `SIN_DATOS`). Hoy conviven dos vocabularios distintos:

| Concepto | Enum actual | Valores |
|---|---|---|
| Estado de la zona (lluvia) | `EstadoZona` | `SIN_DATOS`, `NORMAL`, `PRECAUCION`, `INUNDADO` |
| Clasificación de la foto (IA) | `ClasificacionIA` | `INUNDADO`, `PARCIAL`, `NO_INUNDADO` |

Se acordó que la clasificación de la foto use los valores de `EstadoZona` (excluyendo
`SIN_DATOS`). El código de `reportes` ya emite/expone esos valores; falta migrar la columna.

## 2. Cambio solicitado a DEVELOPER_H (`prisma/schema.prisma`)

```prisma
// antes
enum ClasificacionIA {
  INUNDADO
  PARCIAL
  NO_INUNDADO
}

// después (propuesto)
enum ClasificacionIA {
  INUNDADO
  PRECAUCION
  NORMAL
}
```

- Se mantiene el nombre del enum y el nombre de la columna (`Reporte.clasificacion`) para no
  romper el modelo; solo cambian dos etiquetas.
- Alternativa (si se prefiere no tocar `ClasificacionIA`): reutilizar `EstadoZona` en la
  columna. Requiere decidir cómo se persiste `SIN_DATOS`. Se descarta para el MVP.

### Migración de datos existentes

```sql
ALTER TYPE "ClasificacionIA" RENAME VALUE 'PARCIAL' TO 'PRECAUCION';
ALTER TYPE "ClasificacionIA" RENAME VALUE 'NO_INUNDADO' TO 'NORMAL';
-- INUNDADO se conserva
```

`RENAME VALUE` conserva las filas existentes (no requiere recrear el tipo). Si la base es
nueva (sin datos), basta `prisma migrate dev`.

## 3. Cambio solicitado a `docs/API_MANUAL.md` (contrato)

- **§2 Tipos compartidos**: `type ClasificacionIA` pasa de
  `'INUNDADO' | 'PARCIAL' | 'NO_INUNDADO'` a `'INUNDADO' | 'PRECAUCION' | 'NORMAL'`.
- **§5.4 Gemini / tabla de corroboración**: reemplazar `PARCIAL`/`NO_INUNDADO` por
  `PRECAUCION`/`NORMAL`. La regla `CORROBORADO` pasa a: foto `INUNDADO` **o** `PRECAUCION`
  + lluvia reciente > umbral; `NO_CORROBORADO`: foto `INUNDADO` con lluvia poca/nula.
- **§5.4 Modelo de Gemini**: confirmar nombre vigente (hoy el código usa `gemini-1.5-flash`).

## 4. Estado en el código (DEVELOPER_V)

Mientras la migración no se aplique, existe un adaptador temporal en
`src/modules/reportes/utils/clasificacion-bd.util.ts` que traduce en la frontera con la BD:

| `ClasificacionFoto` (nuevo) | `ClasificacionIA` (columnas hoy) |
|---|---|
| `INUNDADO` | `INUNDADO` |
| `PRECAUCION` | `PARCIAL` |
| `NORMAL` | `NO_INUNDADO` |

### Limpieza al aplicarse la migración

1. `prisma generate` tras aplicar el cambio de H.
2. **Eliminar** `src/modules/reportes/utils/clasificacion-bd.util.ts`.
3. En `src/modules/reportes/reportes.service.ts`: usar `clasificacion` directo al crear y
   `reporte.clasificacion` directo al listar (sin conversión).

## 5. Verificación

- `pnpm prisma validate`
- `pnpm prisma generate`
- `pnpm typecheck` (sin el error de compatibilidad de enum)
- `pnpm lint`
