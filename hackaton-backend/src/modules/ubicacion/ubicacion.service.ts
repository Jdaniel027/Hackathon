import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { APP_ERRORS } from '../../common/exception/app-exception.js';

@Injectable()
export class UbicacionService {
  constructor(private readonly prisma: PrismaService) {}

  async buscarMunicipioPorSlug(slug: string) {
    const municipio = await this.prisma.municipio.findUnique({
      where: { slug },
    });
    if (!municipio) {
      throw APP_ERRORS.MUNICIPIO_NO_ENCONTRADO(slug);
    }
    return municipio;
  }
}
