import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { EtapasService } from './etapas.service';
import { CreateEtapaDto } from './dto/create-etapa.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';

@Controller('projetos/:id/etapas')
export class ProjetoEtapasController {
  constructor(private etapasService: EtapasService) {}

  @RequirePermissao('PROJETOS_READ')
  @Get()
  findAll(@Param('id') id: string) {
    return this.etapasService.findAllByProjeto(id);
  }

  @RequirePermissao('PROJETOS_WRITE')
  @Post()
  create(@Param('id') id: string, @Body() dto: CreateEtapaDto) {
    return this.etapasService.create(id, dto);
  }
}
