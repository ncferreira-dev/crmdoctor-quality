import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { FindNotificacoesQueryDto } from './dto/find-notificacoes-query.dto';

@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);

  constructor(private prisma: PrismaService) {}

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
    this.logger.log(
      `Cron de compliance: ${resultado.criadas} notificação(ões) criada(s) ` +
        `(${resultado.projetos} projeto(s), ${resultado.etapas} etapa(s))`,
    );
    return resultado;
  }

  async verificarPrazosCompliance() {
    const agora = new Date();
    const hoje = new Date(
      Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()),
    );
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
      const dias = Math.round(
        (projeto.dataLimiteCompliance!.getTime() - hoje.getTime()) /
          (24 * 60 * 60 * 1000),
      );
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
      const dias = Math.round(
        (etapa.prazo!.getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000),
      );
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
