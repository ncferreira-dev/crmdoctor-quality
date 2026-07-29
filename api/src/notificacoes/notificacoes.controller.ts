import { Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { NotificacoesService } from './notificacoes.service';
import { FindNotificacoesQueryDto } from './dto/find-notificacoes-query.dto';
import { RequirePermissao } from '../common/decorators/require-permissao.decorator';

@Controller('notificacoes')
export class NotificacoesController {
  constructor(private notificacoesService: NotificacoesService) {}

  @RequirePermissao('NOTIFICACOES_READ')
  @Get()
  findAll(@Query() query: FindNotificacoesQueryDto) {
    return this.notificacoesService.findAll(query);
  }

  @RequirePermissao('NOTIFICACOES_READ')
  @Patch(':id/lida')
  marcarLida(@Param('id') id: string) {
    return this.notificacoesService.marcarLida(id);
  }

  @RequirePermissao('NOTIFICACOES_READ')
  @Post('executar-agora')
  executarAgora() {
    return this.notificacoesService.verificarPrazosCompliance();
  }
}
