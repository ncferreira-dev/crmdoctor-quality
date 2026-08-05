import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProjetosService } from './projetos.service';
import { CreateProjetoDto } from './dto/create-projeto.dto';
import { UpdateProjetoDto } from './dto/update-projeto.dto';
import { UpdateEstagioProjetoDto } from './dto/update-estagio-projeto.dto';
import { FindProjetosQueryDto } from './dto/find-projetos-query.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';

@Controller('projetos')
export class ProjetosController {
  constructor(private projetosService: ProjetosService) {}

  // O usuário chega aqui porque o valor do contrato só sai na resposta para
  // quem tem FINANCEIRO_READ. Filtrar no front seria maquiagem: o número
  // continuaria trafegando e apareceria para quem abrisse o inspecionar.
  @RequirePermissao('PROJETOS_READ')
  @Get()
  findAll(@Query() query: FindProjetosQueryDto, @CurrentUser() user: AuthUser) {
    return this.projetosService.findAll(query, user);
  }

  @RequirePermissao('PROJETOS_READ')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projetosService.findOne(id, user);
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
