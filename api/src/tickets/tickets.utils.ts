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
