import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

// Seed mínimo del MVP: México → Sinaloa → Mazatlán + una zona demo.
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

    // Provisionales: validar ides/idmun contra una respuesta real de Conagua/SMN.
    const idsSmnMazatlan = { idEstadoSmn: 25, idMunSmn: 12 };
    const municipio = await prisma.municipio.upsert({
      where: { slug: 'mazatlan' },
      update: idsSmnMazatlan,
      create: {
        nombre: 'Mazatlán',
        slug: 'mazatlan',
        estadoId: estado.id,
        ...idsSmnMazatlan,
      },
    });

    // Zona demo centrada en Mazatlán (centro histórico). Coordenadas reales de referencia.
    const zona = await prisma.zona.upsert({
      where: {
        latCentro_lngCentro_modelo: {
          latCentro: 23.2494,
          lngCentro: -106.4111,
          modelo: 'ecmwf_ifs',
        },
      },
      update: {},
      create: {
        municipioId: municipio.id,
        latCentro: 23.2494,
        lngCentro: -106.4111,
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
          lat: 23.245,
          lng: -106.415,
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
