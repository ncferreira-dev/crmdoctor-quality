import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { whereEmAberto, whereEmAtraso } from '../tickets/tickets.utils';
import { AuthUser } from '../common/types/auth-user';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async resumo(user?: AuthUser) {
    const agora = new Date();
    const em7Dias = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
    const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    // Promise.all em vez de $transaction: são contagens independentes, sem
    // necessidade de consistência transacional entre elas. $transaction executa
    // sequencialmente — com o banco (Neon/us-east-1) longe do container, eram
    // ~11 idas e voltas de ~150ms cada, dando 1,7s. Em paralelo, o custo cai
    // praticamente ao de uma única ida.
    const [
      projetosPorEstagio,
      projetosEmExecucao,
      projetosConcluidos,
      concluidosNoMes,
      projetosSemPrazo,
      ticketsAbertos,
      visitasProximos7Dias,
      alertasNaoLidos,
      ticketsEmAtraso,
      etapasVencendo7Dias,
      valorEmExecucao,
      concentracao,
      cargaConsultores,
      marcosDaSemana,
    ] = await Promise.all([
      this.prisma.projeto.groupBy({
        by: ['estagio'],
        _count: true,
        orderBy: { estagio: 'asc' },
      }),
      this.prisma.projeto.count({ where: { estagio: 'EXECUCAO' } }),
      this.prisma.projeto.count({ where: { estagio: 'CONCLUIDO' } }),
      this.prisma.projeto.count({
        where: { estagio: 'CONCLUIDO', atualizadoEm: { gte: inicioDoMes } },
      }),
      // Projeto sem prazo é furo silencioso: o cron nunca vai alertar sobre ele.
      this.prisma.projeto.count({
        where: { dataLimiteCompliance: null, estagio: { not: 'CONCLUIDO' } },
      }),
      this.prisma.ticket.count({ where: whereEmAberto() }),
      this.prisma.visita.count({
        where: {
          inicio: { gte: agora, lte: em7Dias },
          status: { not: 'CANCELADA' },
        },
      }),
      // Alerta não lido DESTA pessoa. Contava notificacao.lida, que era o
      // estado da empresa inteira: um colega dava baixa e o número zerava no
      // cartão de todo mundo. Sem usuário na request o número é 0, e não o
      // total, porque afirmar "você tem N alertas" para ninguém em particular
      // é a mesma mentira de antes.
      user
        ? this.prisma.notificacaoDestinatario.count({
            where: { usuarioId: user.sub, lidaEm: null },
          })
        : Promise.resolve(0),
      this.prisma.ticket.count({ where: whereEmAtraso(agora) }),
      this.prisma.etapaProjeto.count({
        where: {
          status: { not: 'CONCLUIDA' },
          prazo: { gte: agora, lte: em7Dias },
        },
      }),
      this.prisma.projeto.aggregate({
        _sum: { valor: true },
        where: { estagio: { not: 'CONCLUIDO' } },
      }),
      this.concentracaoPorEmpresa(),
      this.cargaPorConsultor(),
      this.marcosVencendo(agora, em7Dias),
    ]);

    const podeVerDinheiro =
      user?.permissoes?.includes('FINANCEIRO_READ') ?? false;

    return {
      projetosPorEstagio: projetosPorEstagio.map((p) => ({
        estagio: p.estagio,
        total: p._count,
      })),
      projetosEmExecucao,
      projetosConcluidos,
      concluidosNoMes,
      projetosSemPrazo,
      ticketsAbertos,
      visitasProximos7Dias,
      alertasNaoLidos,
      ticketsEmAtraso,
      etapasVencendo7Dias,
      // null e não 0: zero é uma afirmação ("não há contrato ativo"), e quem
      // não pode ver dinheiro não deve receber afirmação nenhuma sobre ele.
      valorEmExecucao: podeVerDinheiro
        ? Number(valorEmExecucao._sum.valor ?? 0)
        : null,
      concentracao: podeVerDinheiro
        ? concentracao
        : concentracao.map(({ valor: _valor, ...resto }) => ({
            ...resto,
            valor: null,
          })),
      cargaConsultores,
      marcosDaSemana,
    };
  }

  // Onde estão os projetos: quais empresas concentram mais contratos ativos.
  private async concentracaoPorEmpresa() {
    const agrupado = await this.prisma.projeto.groupBy({
      by: ['empresaId'],
      _count: true,
      _sum: { valor: true },
      where: { estagio: { not: 'CONCLUIDO' } },
    });

    if (agrupado.length === 0) return [];

    const empresas = await this.prisma.empresaCliente.findMany({
      where: { id: { in: agrupado.map((g) => g.empresaId) } },
      select: { id: true, nome: true },
    });
    const nomePorId = new Map(empresas.map((e) => [e.id, e.nome]));

    return agrupado
      .map((g) => ({
        empresaId: g.empresaId,
        empresa: nomePorId.get(g.empresaId) ?? 'Empresa',
        projetos: g._count,
        valor: Number(g._sum.valor ?? 0),
      }))
      .sort((a, b) => b.projetos - a.projetos)
      .slice(0, 5);
  }

  // Carga de trabalho: marcos abertos por responsável. Mostra quem está
  // sobrecarregado e quem tem folga.
  private async cargaPorConsultor() {
    const agrupado = await this.prisma.etapaProjeto.groupBy({
      by: ['responsavelId'],
      _count: true,
      where: { status: { not: 'CONCLUIDA' }, responsavelId: { not: null } },
    });

    if (agrupado.length === 0) return [];

    const ids = agrupado
      .map((g) => g.responsavelId)
      .filter((id): id is string => id !== null);
    const usuarios = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, nome: true },
    });
    const nomePorId = new Map(usuarios.map((u) => [u.id, u.nome]));

    return agrupado
      .filter((g) => g.responsavelId !== null)
      .map((g) => ({
        usuarioId: g.responsavelId as string,
        nome: nomePorId.get(g.responsavelId as string) ?? 'Sem nome',
        marcosAbertos: g._count,
      }))
      .sort((a, b) => b.marcosAbertos - a.marcosAbertos);
  }

  // O que precisa ser resolvido nesta semana — lista, não número.
  private async marcosVencendo(de: Date, ate: Date) {
    const etapas = await this.prisma.etapaProjeto.findMany({
      where: { status: { not: 'CONCLUIDA' }, prazo: { gte: de, lte: ate } },
      include: { projeto: { select: { id: true, titulo: true } } },
      orderBy: { prazo: 'asc' },
      take: 10,
    });

    return etapas.map((e) => ({
      id: e.id,
      nome: e.nome,
      prazo: e.prazo,
      projetoId: e.projeto.id,
      projeto: e.projeto.titulo,
    }));
  }
}
