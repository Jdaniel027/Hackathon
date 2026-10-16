# Propuesta — Contrato de integración Crons ↔ Admin (para DEVELOPER_H)

> Documento **de propuesta**, no vinculante. No modifica contratos compartidos.
> Autor: DEVELOPER_V. Contexto: Fase 3 implementada.

## 1. Motivo

`src/app.module.ts` importa `./modules/admin/admin.module.js`, que **no existe** → el build y
`tsc --noEmit` fallan (error pre-existente, fuera del alcance de V). Para que H pueda cerrar el
módulo `admin`, aquí queda fijada la **firma real** que V ya expone.

## 2. Firma final expuesta por V (`CronsService`)

`src/modules/crons/crons.service.ts` exporta:

```ts
export const NOMBRES_CRON = [
  'actualizarClima',
  'reevaluarReportes',
  'expirarRiesgos',
  'revisarCiclones',
] as const;
export type NombreCron = (typeof NOMBRES_CRON)[number];

export interface ResultadoCron {
  nombre: string;        // se mantiene `string` (retrocompatible con el stub)
  ejecutado: boolean;    // false si el proveedor no estaba disponible / sin cambios
  nota: string;          // mensaje legible para el panel admin
  detalle?: Record<string, unknown>; // métricas del job (contadores)
}

@Injectable()
export class CronsService {
  ejecutar(nombre: string): Promise<ResultadoCron>;
  // lanza APP_ERRORS.CRON_DESCONOCIDO(nombre) si `nombre` no está en NOMBRES_CRON
}
```

`CronsModule` ahora **importa `OpenMeteoModule`** (además de `PrismaModule`, que es global).
Para inyectar `CronsService` en `AdminModule`, basta `imports: [CronsModule]`.

## 3. Endpoints que debe exponer H (ya documentados en `API_MANUAL.md` §5.2)

| Método | Ruta | Cuerpo | Acción |
|---|---|---|---|
| POST | `/api/v1/admin/cron/:nombre` | — | `crons.ejecutar(nombre)` (validar contra `NOMBRES_CRON`) |
| POST | `/api/v1/admin/ciclon` | `{ lat, lng, categoria, vientoKmh }` | Plan B manual (V no inventa ciclones) |

Nota sobre `revisarCiclones`: el cron existe pero hoy devuelve `ejecutado: false` con nota
("usar POST /admin/ciclon") porque **no hay fuente JSON de ciclones confirmada** (§5.3). No
persiste datos fabricados.

## 4. Puntos abiertos

- `ConaguaService` (Fase 4) se añadirá como dependencia del cron `actualizarClima`; hoy hay un
  hook `registrarApoyoConagua()` sin efecto, con TODO explícito.
- Si finalmente se acuerda invalidación de caché (Redis) desde los crons (§6 de `DEVELOPER_V.md`),
  V expondrá un evento/callback; hoy no hay dependencia directa con Redis.
