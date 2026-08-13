import { Prisma, StatusTicket } from '@prisma/client';
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

// O selo "Em atraso" de cada linha, calculado com a mesma definição do filtro
// `whereEmAtraso`: em aberto, sem primeira resposta e passado do prazo.
//
// O status entra na conta desde 12/08/2026. Sem ele, um chamado resolvido sem
// carimbo de resposta voltava marcado como atrasado para sempre, e a tela ficava
// com "Resolvido" e "Em atraso" na mesma linha, um desmentindo o outro. O tipo
// exige `status` de propósito: quem chama isto sempre tem a linha inteira do
// banco na mão, e deixar o campo opcional só abriria caminho para a conta ser
// feita pela metade de novo.
export function comCamposCalculados<
  T extends {
    abertoEm: Date;
    prioridade: number;
    primeiraRespostaEm: Date | null;
    status: StatusTicket;
  },
>(ticket: T): T & { prazoLimite: Date; emAtraso: boolean } {
  const prazoLimite = calcularPrazoLimite(ticket);
  const emAtraso =
    ticket.status !== 'RESOLVIDO' &&
    !ticket.primeiraRespostaEm &&
    new Date() > prazoLimite;
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

// Chamado atrasado: em aberto, sem primeira resposta e já passado do prazo da
// prioridade. Sem SQL raw: o prazo varia por linha conforme a prioridade, então
// montamos uma cláusula OR com um limite fixo por prioridade.
//
// O "em aberto" faz parte da definição, e isso foi corrigido em 12/08/2026.
// Antes o filtro olhava só a primeira resposta e o prazo, e um chamado
// RESOLVIDO que nunca teve o carimbo de resposta continuava contando como
// atrasado para sempre. O estrago era discordância entre telas: o e-mail
// diário compunha `whereEmAberto()` por fora e via o número certo, o cartão do
// dashboard não compunha e via um número maior, e na tela de Chamados a visão
// "Em atraso" listava chamado fechado. Medido na base local: 2 no cartão contra
// 1 de verdade.
//
// A regra completa mora aqui, e não no lado de quem chama, pelo mesmo motivo de
// `whereEmAberto`: o que se esquece de compor é o que faz duas telas
// discordarem.
export function whereEmAtraso(
  agora: Date = new Date(),
): Prisma.TicketWhereInput {
  return {
    ...whereEmAberto(),
    primeiraRespostaEm: null,
    OR: Object.entries(PRAZO_HORAS_POR_PRIORIDADE).map(
      ([prioridade, horas]) => ({
        prioridade: Number(prioridade),
        abertoEm: { lt: new Date(agora.getTime() - horas * 60 * 60 * 1000) },
      }),
    ),
  };
}
