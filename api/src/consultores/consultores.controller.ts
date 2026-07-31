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
import { ConsultoresService } from './consultores.service';
import { CreateConsultorDto } from './dto/create-consultor.dto';
import { UpdateConsultorDto } from './dto/update-consultor.dto';
import { FindConsultoresQueryDto } from './dto/find-consultores-query.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';

@Controller('consultores')
export class ConsultoresController {
  constructor(private consultoresService: ConsultoresService) {}

  @RequirePermissao('CONSULTORES_READ')
  @Get()
  findAll(@Query() query: FindConsultoresQueryDto) {
    return this.consultoresService.findAll(query);
  }

  @RequirePermissao('CONSULTORES_READ')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consultoresService.findOne(id);
  }

  @RequirePermissao('CONSULTORES_WRITE')
  @Post()
  create(@Body() dto: CreateConsultorDto) {
    return this.consultoresService.create(dto);
  }

  @RequirePermissao('CONSULTORES_WRITE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConsultorDto) {
    return this.consultoresService.update(id, dto);
  }

  @RequirePermissao('CONSULTORES_WRITE')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.consultoresService.remove(id);
  }
}
