import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ZonasService } from './zonas.service.js';
import type { MapaResponse, ZonaDetalle } from './zonas.types.js';

@ApiTags('mapa')
@Controller()
export class ZonasController {
  constructor(private readonly zonasService: ZonasService) {}

  @Get('mapa/:municipioSlug')
  @ApiOperation({ summary: 'Zonas y riesgos activos de un municipio' })
  @ApiParam({ name: 'municipioSlug', example: 'mazatlan' })
  getMapa(
    @Param('municipioSlug') municipioSlug: string,
  ): Promise<MapaResponse> {
    return this.zonasService.getMapa(municipioSlug);
  }

  @Get('zonas/:id')
  @ApiOperation({ summary: 'Detalle de una zona con sus últimas lecturas' })
  @ApiParam({ name: 'id', example: 1 })
  getZona(@Param('id', ParseIntPipe) id: number): Promise<ZonaDetalle> {
    return this.zonasService.getZona(id);
  }
}
