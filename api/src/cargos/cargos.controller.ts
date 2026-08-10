import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CargosService } from './cargos.service';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';

@Controller('cargos')
export class CargosController {
  constructor(private cargosService: CargosService) {}

  // Fechadas em 09/08/2026. Ficaram sem guarda nenhuma desde o começo do
  // projeto: qualquer pessoa autenticada, inclusive o cargo mais baixo, lia o
  // mapa completo de permissões da empresa. Conferido na tela antes do
  // conserto: o Analista digitava /cargos no endereço e a página renderizava
  // inteira. O menu escondia, a API entregava, que é a mesma maquiagem que
  // este projeto condenou ao restringir o valor de contrato na API.
  @RequirePermissao('CARGOS_MANAGE')
  @Get()
  findAll() {
    return this.cargosService.findAll();
  }

  // Antes de ':id': rota estática precisa vir primeiro, senão o Nest tenta
  // casar "atribuiveis" como :id.
  //
  // Guarda diferente das outras de propósito. Quem cadastra membro precisa
  // escolher um cargo, e isso não é gerenciar cargo: é gerenciar membro. Sem
  // esta rota, fechar as duas acima deixaria o seletor do formulário vazio
  // para quem tem USUARIOS_MANAGE e não tem CARGOS_MANAGE, e vazio em
  // silêncio, porque a tela trata o erro com um catch que zera a lista.
  @RequirePermissao('USUARIOS_MANAGE')
  @Get('atribuiveis')
  atribuiveis() {
    return this.cargosService.atribuiveis();
  }

  @RequirePermissao('CARGOS_MANAGE')
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
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCargoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cargosService.update(id, dto, user);
  }

  @RequirePermissao('CARGOS_MANAGE')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.cargosService.remove(id, user);
  }
}
