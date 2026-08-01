import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResgatarConviteDto } from './dto/resgatar-convite.dto';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.usersService.findOne(user.sub);
  }

  // Primeiro acesso: público (quem resgata ainda não tem sessão) e com rate
  // limit apertado — o código tem 8 dígitos e sem trava seria força-bruteável.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Public()
  @Post('resgatar-convite')
  resgatarConvite(@Body() dto: ResgatarConviteDto) {
    return this.usersService.resgatarConvite(dto);
  }

  // Os próprios dados: sem permissão e sem hierarquia, o dono age sobre si.
  // Ambas as rotas /me ficam antes de @Patch(':id') por clareza de leitura.
  @Patch('me')
  atualizarPerfil(
    @CurrentUser() user: AuthUser,
    @Body() dto: AtualizarPerfilDto,
  ) {
    return this.usersService.atualizarPerfil(user.sub, dto);
  }

  // Troca da própria senha: não exige permissão nenhuma, qualquer pessoa
  // logada troca a sua. Rate limit porque a senha atual é verificada aqui, e
  // sem trava o endpoint viraria um oráculo pra adivinhar a senha de uma
  // sessão roubada.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Patch('me/senha')
  alterarSenha(@CurrentUser() user: AuthUser, @Body() dto: AlterarSenhaDto) {
    return this.usersService.alterarSenha(user.sub, dto);
  }

  @RequirePermissao('USUARIOS_MANAGE')
  @Post(':id/reenviar-convite')
  reenviarConvite(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.reenviarConvite(id, user);
  }

  @RequirePermissao('USUARIOS_MANAGE')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @RequirePermissao('USUARIOS_MANAGE')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @RequirePermissao('USUARIOS_MANAGE')
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.usersService.create(dto, user);
  }

  @RequirePermissao('USUARIOS_MANAGE')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.update(id, dto, user);
  }

  @RequirePermissao('USUARIOS_MANAGE')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.remove(id, user);
  }
}
