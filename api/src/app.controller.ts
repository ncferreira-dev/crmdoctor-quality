import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { CRON_COMPLIANCE } from './notificacoes/notificacoes.service';
import { Public } from './common/decorators/public.decorator';

// Tolerância do heartbeat: o cron roda a cada 24h, então 26h dá folga para
// atraso de boot e horário de verão sem mascarar um dia inteiro perdido.
const LIMITE_HEARTBEAT_MS = 26 * 60 * 60 * 1000;

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  // Vigiado por um monitor externo (UptimeRobot ou similar): 200 = o cron de
  // compliance rodou nas últimas 26h; 503 = parou em silêncio e alguém precisa
  // olhar. Público de propósito — monitor não tem como se autenticar, e a
  // resposta não expõe nada além do timestamp da última execução.
  @Public()
  @Get('health/cron')
  async healthCron() {
    const registro = await this.prisma.cronExecucao.findUnique({
      where: { nome: CRON_COMPLIANCE },
    });

    const atrasado =
      !registro ||
      Date.now() - registro.executadoEm.getTime() > LIMITE_HEARTBEAT_MS;

    if (atrasado) {
      throw new ServiceUnavailableException({
        status: 'atrasado',
        ultimaExecucao: registro?.executadoEm ?? null,
      });
    }

    return { status: 'ok', ultimaExecucao: registro.executadoEm };
  }
}
