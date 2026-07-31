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
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { FindEmpresasQueryDto } from './dto/find-empresas-query.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';

@Controller('empresas')
export class EmpresasController {
  constructor(private empresasService: EmpresasService) {}

  @RequirePermissao('EMPRESAS_READ')
  @Get()
  findAll(@Query() query: FindEmpresasQueryDto) {
    return this.empresasService.findAll(query);
  }

  @RequirePermissao('EMPRESAS_READ')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.empresasService.findOne(id);
  }

  @RequirePermissao('EMPRESAS_WRITE')
  @Post()
  create(@Body() dto: CreateEmpresaDto) {
    return this.empresasService.create(dto);
  }

  @RequirePermissao('EMPRESAS_WRITE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmpresaDto) {
    return this.empresasService.update(id, dto);
  }

  @RequirePermissao('EMPRESAS_WRITE')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.empresasService.remove(id);
  }
}
