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
import { TarefasService } from './tarefas.service';
import { CreateTarefaDto } from './dto/create-tarefa.dto';
import { UpdateTarefaDto } from './dto/update-tarefa.dto';
import { FindTarefasQueryDto } from './dto/find-tarefas-query.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';

@Controller('tarefas')
export class TarefasController {
  constructor(private tarefasService: TarefasService) {}

  @RequirePermissao('TAREFAS_READ')
  @Get()
  findAll(@Query() query: FindTarefasQueryDto) {
    return this.tarefasService.findAll(query);
  }

  @RequirePermissao('TAREFAS_READ')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tarefasService.findOne(id);
  }

  @RequirePermissao('TAREFAS_WRITE')
  @Post()
  create(@Body() dto: CreateTarefaDto) {
    return this.tarefasService.create(dto);
  }

  @RequirePermissao('TAREFAS_WRITE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTarefaDto) {
    return this.tarefasService.update(id, dto);
  }

  @RequirePermissao('TAREFAS_WRITE')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tarefasService.remove(id);
  }
}
