import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { FindNotificacoesQueryDto } from './dto/find-notificacoes-query.dto';
import { diasEntre, inicioDoDiaCivil } from '../common/utils/dia-civil';

// Chave do heartbeat na tabela cron_execucoes. /health/cron lê pela mesma
// constante (exportada) para os dois lados nunca divergirem.
export const CRON_COMPLIANCE = 'compliance-prazos';

@Injectable()
export class NotificacoesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NotificacoesService.name);

  constructor(private prisma: PrismaService) {}

  // Roda o cron no boot. Dois motivos: o deploy diário costuma acontecer fora
  // das 8h, e sem isto o /health/cron responderia 503 até a primeira execução
  // agendada, fazendo o monitor externo alarmar falso depois de cada deploy.
  // É seguro rodar de novo: a criação de notificações é idempotente por
  // constraint. O catch existe porque heartbeat não pode derrubar o boot.
  async onApplicationBootstrap() {
    try {
      await this.executarCronCompliance();
    } catch (erro) {
      this.logger.error('Cron de compliance falhou no boot', erro);
    }
  }

  findAll(query: FindNotificacoesQueryDto) {
    // query.lida já chega como boolean (ou undefined) via @Transform(paraBoolean)
    // no DTO, então não precisa reprocessar aqui.
    return this.prisma.notificacao.findMany({
      where: { lida: query.lida },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async marcarLida(id: string) {
    const notificacao = await this.prisma.notificacao.findUnique({
      where: { id },
    });
    if (!notificacao) {
      throw new NotFoundException('Notificação não encontrada');
    }
    return this.prisma.notificacao.update({
      where: { id },
      data: { lida: true },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM, { timeZone: 'America/Sao_Paulo' })
  async executarCronCompliance() {
    const resultado = await this.verificarPrazosCompliance();
    // Heartbeat DEPOIS do trabalho: só registra execução que terminou. Se a
    // verificação lançar, o carimbo não avança e o /health/cron acusa.
    const executadoEm = new Date();
    await this.prisma.cronExecucao.upsert({
      where: { nome: CRON_COMPLIANCE },
      update: { executadoEm },
      create: { nome: CRON_COMPLIANCE, executadoEm },
    });
    this.logger.log(
      `Cron de compliance: ${resultado.criadas} notificação(ões) criada(s) ` +
        `(${resultado.projetos} projeto(s), ${resultado.etapas} etapa(s))`,
    );
    return resultado;
  }

  async verificarPrazosCompliance() {
    // Dia civil de Brasília, não o dia UTC. O cron agendado roda às 8h daqui
    // (11h UTC, mesmo dia), mas o cron também roda no boot do container, e
    // deploy à noite cai depois da virada do UTC. Ver common/utils/dia-civil.
    const hoje = inicioDoDiaCivil();
    const em15Dias = new Date(hoje.getTime() + 15 * 24 * 60 * 60 * 1000);

    const [criadasProjetos, criadasEtapas] = await Promise.all([
      this.verificarPrazosProjetos(hoje, em15Dias),
      this.verificarPrazosEtapas(hoje, em15Dias),
    ]);

    return {
      criadas: criadasProjetos + criadasEtapas,
      projetos: criadasProjetos,
      etapas: criadasEtapas,
    };
  }

  private async verificarPrazosProjetos(
    hoje: Date,
    em15Dias: Date,
  ): Promise<number> {
    const projetos = await this.prisma.projeto.findMany({
      where: {
        estagio: { not: 'CONCLUIDO' },
        dataLimiteCompliance: { gte: hoje, lte: em15Dias },
      },
      include: { empresa: true },
    });

    if (projetos.length === 0) {
      return 0;
    }

    const dados = projetos.map((projeto) => {
      const dias = diasEntre(hoje, projeto.dataLimiteCompliance!);
      return {
        tipo: 'COMPLIANCE_PRAZO',
        mensagem: `Projeto ${projeto.titulo} da empresa ${projeto.empresa.nome} vence em ${dias} dias`,
        projetoId: projeto.id,
        dataReferencia: projeto.dataLimiteCompliance,
      };
    });

    // O @@unique([projetoId, tipo, dataReferencia]) no schema garante idempotência:
    // se o cron rodar duas vezes no mesmo dia (ou for disparado manualmente depois),
    // skipDuplicates evita criar um segundo alerta pro mesmo projeto/prazo.
    const resultado = await this.prisma.notificacao.createMany({
      data: dados,
      skipDuplicates: true,
    });
    return resultado.count;
  }

  private async verificarPrazosEtapas(
    hoje: Date,
    em15Dias: Date,
  ): Promise<number> {
    const etapas = await this.prisma.etapaProjeto.findMany({
      where: {
        status: { not: 'CONCLUIDA' },
        prazo: { gte: hoje, lte: em15Dias },
      },
      include: { projeto: { include: { empresa: true } } },
    });

    if (etapas.length === 0) {
      return 0;
    }

    const dados = etapas.map((etapa) => {
      const dias = diasEntre(hoje, etapa.prazo!);
      return {
        tipo: 'COMPLIANCE_ETAPA',
        mensagem: `Etapa ${etapa.nome} do projeto ${etapa.projeto.titulo} (empresa ${etapa.projeto.empresa.nome}) vence em ${dias} dias`,
        etapaId: etapa.id,
        // projetoId fica de fora de propósito: o @@unique([etapaId, tipo, dataReferencia])
        // é quem garante a idempotência deste fluxo (ver schema.prisma). Se preenchêssemos
        // projetoId aqui, duas etapas do mesmo projeto com o mesmo prazo colidiriam no
        // índice único de projetos (que não conhece etapaId) e uma notificação legítima
        // seria descartada pelo skipDuplicates.
        dataReferencia: etapa.prazo,
      };
    });

    const resultado = await this.prisma.notificacao.createMany({
      data: dados,
      skipDuplicates: true,
    });
    return resultado.count;
  }
}
