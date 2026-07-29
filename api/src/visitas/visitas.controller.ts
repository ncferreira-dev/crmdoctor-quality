import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { VisitasService } from './visitas.service';
import { CreateVisitaDto } from './dto/create-visita.dto';
import { UpdateVisitaDto } from './dto/update-visita.dto';
import { FindVisitasQueryDto } from './dto/find-visitas-query.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';

@Controller('visitas')
export class VisitasController {
  constructor(private visitasService: VisitasService) {}

  @RequirePermissao('VISITAS_READ')
  @Get()
  findAll(@Query() query: FindVisitasQueryDto) {
    return this.visitasService.findAll(query);
  }

  @RequirePermissao('VISITAS_READ')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.visitasService.findOne(id);
  }

  @RequirePermissao('VISITAS_WRITE')
  @Post()
  create(@Body() dto: CreateVisitaDto) {
    return this.visitasService.create(dto);
  }

  @RequirePermissao('VISITAS_WRITE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVisitaDto) {
    return this.visitasService.update(id, dto);
  }

  @RequirePermissao('VISITAS_WRITE')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.visitasService.remove(id);
  }
}
