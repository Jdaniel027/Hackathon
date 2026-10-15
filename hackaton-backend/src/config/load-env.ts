import { config } from 'dotenv';

// Se importa como PRIMER import de main.ts. Con ESM los imports se evalúan en orden,
// así que el .env queda cargado antes de que se evalúen los decoradores que leen
// process.env (por ejemplo, los límites de rate limiting de rate-limit.constants.ts).
config();
