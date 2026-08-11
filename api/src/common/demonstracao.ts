import { Prisma } from '@prisma/client';

// O QUE É TRABALHO DE CLIENTE, num lugar só.
//
// A produção mistura cenário de demonstração e cliente desde o começo. Medido
// em 10/08/2026: das 6 empresas, 2 eram encenação; dos 6 projetos, 4. Enquanto
// isso durasse, todo número do dashboard era parte real e parte teatro, e
// nenhuma conclusão sobre uso valia.
//
// A saída escolhida foi MARCAR, não apagar: o cenário serve para mostrar o
// produto, e apagar levaria junto o histórico que o torna convincente.
//
// Estes fragmentos existem para a regra não ser reescrita em cada consulta. É a
// mesma razão de `whereEmAberto` em tickets.utils.ts: duas cópias da mesma
// regra é como o card "Tickets abertos" e a lista da empresa passaram a
// discordar na tela.
//
// A HERANÇA é por relação, e não por coluna repetida: marco, tarefa, ticket e
// visita não têm flag própria, porque a pergunta "isto é demonstração" se
// responde olhando o projeto ou a empresa a que pertencem. A exceção é
// `Interacao`, que tem coluna própria porque duas interações de demonstração da
// produção estão penduradas em empresas REAIS.

export const EMPRESA_REAL: Prisma.EmpresaClienteWhereInput = {
  demonstracao: false,
};

export const PROJETO_REAL: Prisma.ProjetoWhereInput = { demonstracao: false };

export const INTERACAO_REAL: Prisma.InteracaoWhereInput = {
  demonstracao: false,
};

export const TICKET_REAL: Prisma.TicketWhereInput = {
  empresa: { demonstracao: false },
};

export const VISITA_REAL: Prisma.VisitaWhereInput = {
  empresa: { demonstracao: false },
};

export const ETAPA_REAL: Prisma.EtapaProjetoWhereInput = {
  projeto: { demonstracao: false },
};

// Tarefa sem projeto é real: é trabalho que alguém distribuiu para uma pessoa,
// sem vínculo com contrato. Tratar "sem projeto" como demonstração sumiria com
// tarefa legítima do contador.
export const TAREFA_REAL: Prisma.TarefaWhereInput = {
  OR: [{ projetoId: null }, { projeto: { demonstracao: false } }],
};

// Alerta de compliance de projeto de demonstração não é assunto de ninguém: ele
// cobraria prazo de contrato que não existe. Vale tanto para o que o cron cria
// quanto para o que o sino e o e-mail diário mostram.
export const NOTIFICACAO_REAL: Prisma.NotificacaoWhereInput = {
  AND: [
    { OR: [{ projetoId: null }, { projeto: { demonstracao: false } }] },
    {
      OR: [{ etapaId: null }, { etapa: { projeto: { demonstracao: false } } }],
    },
  ],
};
