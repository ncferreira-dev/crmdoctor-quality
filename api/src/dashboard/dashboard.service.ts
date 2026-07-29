import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async resumo() {
    const agora = new Date();
    const em7Dias = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      leadsAtivos,
      leadsGanhos,
      leadsPerdidos,
      projetosPorEstagio,
      projetosEmExecucao,
      ticketsAbertos,
      visitasProximos7Dias,
      alertasNaoLidos,
    ] = await this.prisma.$transaction([
      this.prisma.lead.count({ where: { estagio: { notIn: ['GANHO', 'PERDIDO'] } } }),
      this.prisma.lead.count({ where: { estagio: 'GANHO' } }),
      this.prisma.lead.count({ where: { estagio: 'PERDIDO' } }),
      this.prisma.projeto.groupBy({ by: ['estagio'], _count: true, orderBy: { estagio: 'asc' } }),
      this.prisma.projeto.count({ where: { estagio: 'EXECUCAO' } }),
      this.prisma.ticket.count({ where: { status: { not: 'RESOLVIDO' } } }),
      this.prisma.visita.count({
        where: { inicio: { gte: agora, lte: em7Dias }, status: { not: 'CANCELADA' } },
      }),
      this.prisma.notificacao.count({ where: { lida: false } }),
    ]);

    const totalDecididos = leadsGanhos + leadsPerdidos;
    const taxaConversao = totalDecididos === 0 ? 0 : leadsGanhos / totalDecididos;

    return {
      leadsAtivos,
      projetosPorEstagio: projetosPorEstagio.map((p) => ({ estagio: p.estagio, total: p._count })),
      projetosEmExecucao,
      taxaConversao,
      ticketsAbertos,
      visitasProximos7Dias,
      alertasNaoLidos,
    };
  }
}
