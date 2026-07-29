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
import { CompetenciasService } from './competencias.service';
import { CreateCompetenciaDto } from './dto/create-competencia.dto';
import { UpdateCompetenciaDto } from './dto/update-competencia.dto';
import { FindCompetenciasQueryDto } from './dto/find-competencias-query.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';

@Controller('competencias')
export class CompetenciasController {
  constructor(private competenciasService: CompetenciasService) {}

  @RequirePermissao('COMPETENCIAS_READ')
  @Get()
  findAll(@Query() query: FindCompetenciasQueryDto) {
    return this.competenciasService.findAll(query);
  }

  @RequirePermissao('COMPETENCIAS_READ')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.competenciasService.findOne(id);
  }

  @RequirePermissao('COMPETENCIAS_WRITE')
  @Post()
  create(@Body() dto: CreateCompetenciaDto) {
    return this.competenciasService.create(dto);
  }

  @RequirePermissao('COMPETENCIAS_WRITE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCompetenciaDto) {
    return this.competenciasService.update(id, dto);
  }

  @RequirePermissao('COMPETENCIAS_WRITE')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.competenciasService.remove(id);
  }
}
