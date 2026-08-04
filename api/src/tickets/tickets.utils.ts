import { Prisma } from '@prisma/client';
import { PRAZO_HORAS_POR_PRIORIDADE } from './tickets.constants';

function horasPorPrioridade(prioridade: number): number {
  return (
    PRAZO_HORAS_POR_PRIORIDADE[prioridade] ?? PRAZO_HORAS_POR_PRIORIDADE[2]
  );
}

export function calcularPrazoLimite(ticket: {
  abertoEm: Date;
  prioridade: number;
}): Date {
  const horas = horasPorPrioridade(ticket.prioridade);
  return new Date(ticket.abertoEm.getTime() + horas * 60 * 60 * 1000);
}

export function comCamposCalculados<
  T extends {
    abertoEm: Date;
    prioridade: number;
    primeiraRespostaEm: Date | null;
  },
>(ticket: T): T & { prazoLimite: Date; emAtraso: boolean } {
  const prazoLimite = calcularPrazoLimite(ticket);
  const emAtraso = !ticket.primeiraRespostaEm && new Date() > prazoLimite;
  return { ...ticket, prazoLimite, emAtraso };
}

// O que conta como ticket em aberto, em um lugar só.
//
// Existia escrito à mão em dois services (dashboard e empresas). Duas cópias da
// mesma regra é como o card "Tickets abertos" e a lista da empresa passaram a
// discordar na tela, e é como voltariam a discordar no dia em que alguém
// acrescentasse um status novo ao enum e atualizasse só um dos dois.
//
// "Em aberto" é definido por exclusão de propósito: status novo nasce contando
// como aberto, que é o padrão seguro num sistema de compliance. Esquecer de
// incluir um status faz o número subir; esquecer de excluir faz um chamado
// sumir do radar.
export function whereEmAberto(): Prisma.TicketWhereInput {
  return { status: { not: 'RESOLVIDO' } };
}

// Reaproveitado pelo dashboard. Sem SQL raw: o prazo varia por linha conforme
// a prioridade, então montamos uma cláusula OR com um limite fixo por prioridade.
export function whereEmAtraso(
  agora: Date = new Date(),
): Prisma.TicketWhereInput {
  return {
    primeiraRespostaEm: null,
    OR: Object.entries(PRAZO_HORAS_POR_PRIORIDADE).map(
      ([prioridade, horas]) => ({
        prioridade: Number(prioridade),
        abertoEm: { lt: new Date(agora.getTime() - horas * 60 * 60 * 1000) },
      }),
    ),
  };
}
