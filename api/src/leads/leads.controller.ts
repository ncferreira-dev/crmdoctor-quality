import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpdateEstagioDto } from './dto/update-estagio.dto';
import { FindLeadsQueryDto } from './dto/find-leads-query.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';

@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @RequirePermissao('LEADS_READ')
  @Get()
  findAll(@Query() query: FindLeadsQueryDto) {
    return this.leadsService.findAll(query);
  }

  @RequirePermissao('LEADS_READ')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @RequirePermissao('LEADS_WRITE')
  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @RequirePermissao('LEADS_WRITE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, dto);
  }

  @RequirePermissao('LEADS_WRITE')
  @Patch(':id/estagio')
  updateEstagio(@Param('id') id: string, @Body() dto: UpdateEstagioDto) {
    return this.leadsService.updateEstagio(id, dto);
  }

  @RequirePermissao('LEADS_WRITE')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }

  @RequirePermissao('EMPRESAS_WRITE')
  @Post(':id/converter')
  converter(@Param('id') id: string) {
    return this.leadsService.converter(id);
  }
}
