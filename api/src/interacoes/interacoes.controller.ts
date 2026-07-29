import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InteracoesService } from './interacoes.service';
import { CreateInteracaoDto } from './dto/create-interacao.dto';
import { FindInteracoesQueryDto } from './dto/find-interacoes-query.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';

@Controller('interacoes')
export class InteracoesController {
  constructor(private interacoesService: InteracoesService) {}

  @RequirePermissao('INTERACOES_READ')
  @Get()
  findAll(@Query() query: FindInteracoesQueryDto) {
    return this.interacoesService.findAll(query);
  }

  @RequirePermissao('INTERACOES_WRITE')
  @Post()
  create(@Body() dto: CreateInteracaoDto) {
    return this.interacoesService.create(dto);
  }
}
