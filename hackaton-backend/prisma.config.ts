import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7: la URL de conexión para el CLI (migrate, db, studio) se define aquí.
// La aplicación usa el driver adapter `@prisma/adapter-pg` (ver src/prisma/prisma.service.ts).
// Se usa process.env (no el helper env()) para que `prisma generate` funcione sin DATABASE_URL.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
