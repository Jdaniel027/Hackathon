import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'Falta DATABASE_URL: no se puede inicializar el cliente Prisma.',
      );
    }
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit(): Promise<void> {
    try {
      // $connect es perezoso con driver adapters: forzamos una consulta trivial
      // para verificar la conexión de verdad.
      await this.$queryRaw`SELECT 1`;
      this.logger.log('Conexión a PostgreSQL verificada.');
    } catch (error) {
      // No abortamos el arranque: /health debe poder responder aunque la BD esté caída.
      this.logger.warn(
        'No se pudo verificar la conexión a PostgreSQL al iniciar; la API arranca igual.',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
