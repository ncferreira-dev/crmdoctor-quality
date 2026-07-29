import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CargosService } from './cargos.service';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';

@Controller('cargos')
export class CargosController {
  constructor(private cargosService: CargosService) {}

  @Get()
  findAll() {
    return this.cargosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cargosService.findOne(id);
  }

  @RequirePermissao('CARGOS_MANAGE')
  @Post()
  create(@Body() dto: CreateCargoDto, @CurrentUser() user: AuthUser) {
    return this.cargosService.create(dto, user);
  }

  @RequirePermissao('CARGOS_MANAGE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCargoDto, @CurrentUser() user: AuthUser) {
    return this.cargosService.update(id, dto, user);
  }

  @RequirePermissao('CARGOS_MANAGE')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.cargosService.remove(id, user);
  }
}
