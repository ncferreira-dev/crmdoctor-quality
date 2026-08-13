import { StatusTicket, Ticket } from '../types';

// A regra que decide o que a tela de Chamados mostra primeiro.
//
// Mora aqui, e não dentro do componente, pelo mesmo motivo de `lib/tarefas.ts`:
// é uma conta que muda o que a pessoa vê ao abrir a tela de manhã, e conta
// dentro de componente não tem como ser testada.

// Os grupos são por SLA, e não por status.
//
// Status é o que a equipe escreveu no chamado; SLA é o que o cliente está
// sentindo. Um chamado "Em andamento" há três dias sem primeira resposta e um
// "Aberto" de agora há pouco têm status diferentes e cobram coisas opostas:
// o primeiro é dívida vencida, o segundo é trabalho normal do dia. Agrupar por
// status colocaria os dois em caixas separadas por um critério que não ajuda
// ninguém a escolher o que fazer agora.
export interface GrupoDeChamados {
  chave: string;
  titulo: string;
  // Uma linha explicando o que o grupo significa. A tela de chamados é a
  // primeira que alguém de fora da equipe abre, e "Aguardando resposta" não
  // quer dizer nada por conta própria.
  explicacao: string;
  chamados: Ticket[];
  destaque?: boolean;
}

export function agruparPorSla(chamados: Ticket[]): GrupoDeChamados[] {
  const emAtraso: Ticket[] = [];
  const semResposta: Ticket[] = [];
  const emCurso: Ticket[] = [];
  const resolvidos: Ticket[] = [];

  for (const chamado of chamados) {
    if (chamado.status === 'RESOLVIDO') {
      resolvidos.push(chamado);
      continue;
    }
    // `emAtraso` é calculado pela API (tickets.utils), e não aqui: o prazo
    // depende da tabela de horas por prioridade, que vive no servidor. Refazer
    // a conta no navegador criaria uma segunda versão da mesma regra, que é
    // exatamente como o card do dashboard e a lista da empresa se
    // contradisseram antes.
    if (chamado.emAtraso) emAtraso.push(chamado);
    else if (!chamado.primeiraRespostaEm) semResposta.push(chamado);
    else emCurso.push(chamado);
  }

  return [
    {
      chave: 'em-atraso',
      titulo: 'Em atraso',
      explicacao: 'Passaram do prazo de resposta da prioridade e ninguém respondeu ainda.',
      chamados: emAtraso,
      destaque: true,
    },
    {
      chave: 'sem-resposta',
      titulo: 'Aguardando primeira resposta',
      explicacao: 'Ainda dentro do prazo. Registre a resposta antes de o prazo virar.',
      chamados: semResposta,
    },
    {
      chave: 'em-curso',
      titulo: 'Respondidos, em aberto',
      explicacao: 'O cliente já teve retorno e o chamado continua em andamento.',
      chamados: emCurso,
    },
    {
      chave: 'resolvidos',
      titulo: 'Resolvidos',
      explicacao: 'Fechados. Ficam na lista para consulta.',
      chamados: resolvidos,
    },
  ].filter((grupo) => grupo.chamados.length > 0);
}

// As quatro visões da tela, e o que cada uma pede à API.
//
// O filtro vai para o servidor em vez de baixar tudo e peneirar no navegador:
// é o mesmo desenho da tela de tarefas, e é o que faz a tela continuar de pé
// quando a base de chamados crescer.
export type VisaoChamados = 'em-aberto' | 'em-atraso' | 'resolvidos' | 'todos';

export const VISOES: { valor: VisaoChamados; label: string }[] = [
  { valor: 'em-aberto', label: 'Em aberto' },
  { valor: 'em-atraso', label: 'Em atraso' },
  { valor: 'resolvidos', label: 'Resolvidos' },
  { valor: 'todos', label: 'Todos' },
];

const FILTRO_DA_VISAO: Record<VisaoChamados, string[]> = {
  'em-aberto': ['emAberto=true'],
  'em-atraso': ['emAtraso=true'],
  resolvidos: ['status=RESOLVIDO'],
  todos: [],
};

export function caminhoDaBusca(visao: VisaoChamados, empresaId: string): string {
  const partes = [...FILTRO_DA_VISAO[visao]];
  if (empresaId) partes.push(`empresaId=${empresaId}`);
  return partes.length ? `/tickets?${partes.join('&')}` : '/tickets';
}

// Busca por texto, no que está na tela: título, descrição e nome da empresa.
// Não vai para a API de propósito. A rota não tem parâmetro de busca, e
// inventar um agora significaria escolher entre `contains` sem índice (varre a
// tabela) e busca textual de verdade (migration, índice, mais peça para manter)
// para uma base que hoje cabe inteira na memória do navegador.
export function filtrarPorTexto(chamados: Ticket[], busca: string): Ticket[] {
  const termo = busca.trim().toLowerCase();
  if (!termo) return chamados;
  return chamados.filter((chamado) =>
    `${chamado.titulo} ${chamado.descricao ?? ''} ${chamado.empresa?.nome ?? ''}`
      .toLowerCase()
      .includes(termo),
  );
}

// O resumo do topo da tela. Conta sobre a lista carregada, e por isso a tela só
// o mostra na visão "Todos": na visão "Em aberto" o número "0 resolvidos" seria
// verdade sobre a lista e mentira sobre o sistema.
export function contarPorSituacao(chamados: Ticket[]): {
  emAberto: number;
  emAtraso: number;
} {
  const naoResolvidos = chamados.filter(
    (chamado) => chamado.status !== ('RESOLVIDO' satisfies StatusTicket),
  );
  return {
    emAberto: naoResolvidos.length,
    emAtraso: naoResolvidos.filter((chamado) => chamado.emAtraso).length,
  };
}
