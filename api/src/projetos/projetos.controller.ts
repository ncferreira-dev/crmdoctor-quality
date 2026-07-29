import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProjetosService } from './projetos.service';
import { CreateProjetoDto } from './dto/create-projeto.dto';
import { UpdateProjetoDto } from './dto/update-projeto.dto';
import { UpdateEstagioProjetoDto } from './dto/update-estagio-projeto.dto';
import { FindProjetosQueryDto } from './dto/find-projetos-query.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';

@Controller('projetos')
export class ProjetosController {
  constructor(private projetosService: ProjetosService) {}

  @RequirePermissao('PROJETOS_READ')
  @Get()
  findAll(@Query() query: FindProjetosQueryDto) {
    return this.projetosService.findAll(query);
  }

  @RequirePermissao('PROJETOS_READ')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projetosService.findOne(id);
  }

  @RequirePermissao('PROJETOS_WRITE')
  @Post()
  create(@Body() dto: CreateProjetoDto) {
    return this.projetosService.create(dto);
  }

  @RequirePermissao('PROJETOS_WRITE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjetoDto) {
    return this.projetosService.update(id, dto);
  }

  @RequirePermissao('PROJETOS_WRITE')
  @Patch(':id/estagio')
  updateEstagio(@Param('id') id: string, @Body() dto: UpdateEstagioProjetoDto) {
    return this.projetosService.updateEstagio(id, dto);
  }

  @RequirePermissao('PROJETOS_WRITE')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projetosService.remove(id);
  }
}
