import { Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { NotificacoesService } from './notificacoes.service';
import { FindNotificacoesQueryDto } from './dto/find-notificacoes-query.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';

@Controller('notificacoes')
export class NotificacoesController {
  constructor(private notificacoesService: NotificacoesService) {}

  // O usuário chega até o service porque alerta agora tem destinatário: esta
  // rota devolve o que ESTA pessoa precisa ver, e não a lista da empresa.
  @RequirePermissao('NOTIFICACOES_READ')
  @Get()
  findAll(
    @Query() query: FindNotificacoesQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notificacoesService.findAll(user.sub, query);
  }

  @RequirePermissao('NOTIFICACOES_READ')
  @Patch(':id/lida')
  marcarLida(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificacoesService.marcarLida(id, user.sub);
  }

  // Dispara o vigia de prazos na hora, sem esperar as 08:00. É ESCRITA: cria
  // notificação e destinatário.
  //
  // Ficava atrás de NOTIFICACOES_READ, ou seja, uma permissão de leitura
  // protegendo uma ação de escrita, e medido em 09/08/2026 o token de Analista
  // recebia 201 aqui. Agora exige PROJETOS_WRITE, porque quem força o vigia de
  // prazos é quem mexe em prazo. Reusa permissão que já existe em vez de criar
  // uma quarta só para esta rota.
  @RequirePermissao('PROJETOS_WRITE')
  @Post('executar-agora')
  executarAgora() {
    return this.notificacoesService.verificarPrazosCompliance();
  }
}
