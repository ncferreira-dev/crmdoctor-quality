import {
  EstagioProjeto,
  Segmento,
  StatusEtapa,
  StatusTarefa,
  StatusTicket,
  StatusVisita,
} from '../types';

export const ESTAGIO_PROJETO_LABEL: Record<EstagioProjeto, string> = {
  DIAGNOSTICO: 'Diagnóstico',
  PROPOSTA: 'Proposta',
  EXECUCAO: 'Execução',
  CONCLUIDO: 'Concluído',
};

// Ordem do funil de entrega (o enum vem alfabético do backend, que não é a
// ordem do processo).
export const ESTAGIOS_PROJETO: EstagioProjeto[] = [
  'DIAGNOSTICO',
  'PROPOSTA',
  'EXECUCAO',
  'CONCLUIDO',
];

// O que cada estágio quer dizer, escrito na tela.
//
// Até 05/08/2026 os quatro eram só nomes: o sistema tratava os três primeiros
// de forma idêntica e ninguém sabia dizer o que significavam. Quatro palavras
// sem definição não são um campo, são decoração, e decoração num CRM de
// compliance vira dado preenchido no chute.
//
// Só CONCLUIDO tem consequência de verdade, e ela está escrita abaixo de
// propósito: é a única que desliga o alerta de prazo. Um projeto marcado como
// concluído para de cobrar, e isso não pode ser surpresa.
export const ESTAGIO_PROJETO_DESCRICAO: Record<EstagioProjeto, string> = {
  DIAGNOSTICO: 'Levantando o que a empresa já tem e o que falta. Ainda sem escopo fechado.',
  PROPOSTA: 'Escopo e valor apresentados. Esperando o cliente aprovar para começar.',
  EXECUCAO: 'Aprovado e em andamento. É a fase em que os marcos de compliance correm.',
  CONCLUIDO: 'Entregue. O projeto para de gerar alerta de prazo e sai da conta de prazos em risco.',
};

// O próximo passo do funil, ou null se já chegou ao fim. Existe para a tela
// oferecer "Avançar para X" em vez de exigir que a pessoa adivinhe qual das
// quatro palavras clicar.
export function proximoEstagio(atual: EstagioProjeto): EstagioProjeto | null {
  const i = ESTAGIOS_PROJETO.indexOf(atual);
  return i >= 0 && i < ESTAGIOS_PROJETO.length - 1 ? ESTAGIOS_PROJETO[i + 1] : null;
}

export const STATUS_TAREFA_LABEL: Record<StatusTarefa, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
};

export const STATUS_ETAPA_LABEL: Record<StatusEtapa, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
};

// Maiúscula só na primeira letra da frase inteira. Existe porque o CSS
// `capitalize` maiusculiza CADA palavra e produz "Agosto De 2026" e
// "Terça-Feira": em português, preposição e artigo no meio da data ficam em
// minúscula. Formatação de texto é trabalho de função, não de folha de estilo.
export function capitalizarPrimeira(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Prazo, dataLimiteCompliance e dataReferencia são @db.Date no banco: data
// civil, sem hora. O Prisma devolve "2026-08-16T00:00:00.000Z", e converter
// isso para America/Sao_Paulo joga o instante para as 21h do dia ANTERIOR — a
// tela passava a anunciar 15/08 um prazo que vence 16/08. Num CRM de
// compliance, prazo com um dia a menos é informação errada, não detalhe. Data
// civil é lida direto da string, sem passar por fuso nenhum.
export function formatarDataCivil(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

// Mesma data civil, como Date à meia-noite LOCAL, para poder comparar com hoje
// sem que o fuso empurre a conta para o dia vizinho.
function dataCivilLocal(iso: string): Date {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

export type UrgenciaPrazo = 'vencido' | 'critico' | 'proximo' | 'tranquilo' | 'sem-prazo';

// A régua de urgência do compliance. O cron alerta a 15 dias, então a UI usa a
// MESMA janela: o que o sistema considera "avisar" é o que a tela pinta de
// alerta. Divergir aqui faria a tela contradizer a notificação.
export function urgenciaDoPrazo(prazoIso: string | null): UrgenciaPrazo {
  if (!prazoIso) return 'sem-prazo';

  const dias = diasAteOPrazo(prazoIso);

  if (dias < 0) return 'vencido';
  if (dias <= 7) return 'critico';
  if (dias <= 15) return 'proximo';
  return 'tranquilo';
}

export function diasAteOPrazo(prazoIso: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  // Meia-noite local dos dois lados: a conta dá dias inteiros exatos, sem
  // depender de Math.round para compensar as 3h de diferença de fuso.
  const diff = dataCivilLocal(prazoIso).getTime() - hoje.getTime();
  return Math.round(diff / (24 * 60 * 60 * 1000));
}

// Texto humano do prazo, já com o sinal de urgência embutido.
export function textoPrazo(prazoIso: string | null): string {
  if (!prazoIso) return 'Sem prazo definido';
  const dias = diasAteOPrazo(prazoIso);
  if (dias < 0) return `Vencido há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`;
  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return 'Vence amanhã';
  return `Vence em ${dias} dias`;
}

export const STATUS_VISITA_LABEL: Record<StatusVisita, string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
};

// Paleta monocromática + accent (CLAUDE.md): os 4 status são diferenciados por
// tom de brand/ink, não por cores diversas. Chip usado no calendário.
export const STATUS_VISITA_CHIP: Record<StatusVisita, string> = {
  AGENDADA: 'bg-brand/70 text-white',
  CONFIRMADA: 'bg-brand text-white',
  REALIZADA: 'bg-ink/30 text-ink',
  CANCELADA: 'bg-surface text-ink/40 line-through',
};

export const SEGMENTO_LABEL: Record<Segmento, string> = {
  FARMA: 'Farma',
  COSMETICOS: 'Cosméticos',
  HOSPITALAR: 'Hospitalar',
  LOGISTICA: 'Logística',
  LABORATORIO: 'Laboratório',
  OUTRO: 'Outro',
};

export const STATUS_TICKET_LABEL: Record<StatusTicket, string> = {
  ABERTO: 'Aberto',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_CLIENTE: 'Aguardando cliente',
  RESOLVIDO: 'Resolvido',
};

export const PRIORIDADE_LABEL: Record<number, string> = {
  1: 'Alta',
  2: 'Média',
  3: 'Baixa',
};

const FUSO = 'America/Sao_Paulo';

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: FUSO });
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
