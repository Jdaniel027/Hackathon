import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

// Seed mínimo del MVP: México → Sinaloa → Guasave + una zona demo.
// Ejecutar con: pnpm prisma:seed  (o `pnpm prisma migrate dev` si configuras el seed).
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Falta DATABASE_URL para ejecutar el seed.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const pais = await prisma.pais.upsert({
      where: { nombre: 'México' },
      update: {},
      create: { nombre: 'México' },
    });

    const estado = await prisma.estado.upsert({
      where: { paisId_nombre: { paisId: pais.id, nombre: 'Sinaloa' } },
      update: {},
      create: { nombre: 'Sinaloa', paisId: pais.id },
    });

    // Verificados contra Conagua/SMN method=3: Guasave, Sinaloa (25/11).
    const idsSmnGuasave = { idEstadoSmn: 25, idMunSmn: 11 };
    const municipio = await prisma.municipio.upsert({
      where: { slug: 'guasave' },
      update: idsSmnGuasave,
      create: {
        nombre: 'Guasave',
        slug: 'guasave',
        estadoId: estado.id,
        ...idsSmnGuasave,
      },
    });

    // Centro de Guasave según el pronóstico horario SMN (25.5655, -108.4718).
    const zona = await prisma.zona.upsert({
      where: {
        latCentro_lngCentro_modelo: {
          latCentro: 25.5655,
          lngCentro: -108.4718,
          modelo: 'ecmwf_ifs',
        },
      },
      update: {},
      create: {
        municipioId: municipio.id,
        latCentro: 25.5655,
        lngCentro: -108.4718,
        ladoM: 9000,
      },
    });

    // Riesgo manual de demo (idempotente: solo si aún no existe uno igual).
    const riesgoExistente = await prisma.zonaRiesgo.findFirst({
      where: {
        municipioId: municipio.id,
        motivo: 'ALTURA',
        origen: 'MANUAL',
      },
    });
    if (!riesgoExistente) {
      await prisma.zonaRiesgo.create({
        data: {
          municipioId: municipio.id,
          lat: 25.5655,
          lng: -108.4718,
          radioM: 500,
          motivo: 'ALTURA',
          origen: 'MANUAL',
        },
      });
    }

    console.log(
      `Seed listo → país=${pais.nombre}, estado=${estado.nombre}, municipio=${municipio.slug}, zona=${zona.id}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Error en el seed:', error);
  process.exitCode = 1;
});
