import {
  EstagioProjeto,
  Segmento,
  StatusEtapa,
  StatusTarefa,
  StatusTicket,
  StatusVisita,
  TipoInteracao,
} from '../types';

// O valor guardado no banco continua EXECUCAO: trocar o enum exigiria migration
// destrutiva por causa de um rótulo, e rótulo é coisa de tela. Aqui é o único
// lugar que decide como o estágio se chama para quem lê.
export const ESTAGIO_PROJETO_LABEL: Record<EstagioProjeto, string> = {
  DIAGNOSTICO: 'Diagnóstico',
  PROPOSTA: 'Proposta',
  EXECUCAO: 'Em andamento',
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
  EXECUCAO: 'Aprovado e rodando. É a fase em que os marcos de compliance correm.',
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

// O fuso do prazo de compliance, e a razão de ele ser fixo.
//
// O prazo é uma data civil brasileira: "vence em 16/08" vale para a empresa
// toda, não para o relógio de quem abriu a tela. `new Date()` com
// `setHours(0,0,0,0)` dava a meia-noite da MÁQUINA: numa em Brasília a conta
// batia, numa em UTC, depois das 21h, ela andava um dia inteiro. É a mesma
// classe de defeito que a API já pagou para consertar com `inicioDoDiaCivil`, e
// a regra não tinha sido estendida ao front.
const FUSO_BRASIL = 'America/Sao_Paulo';

const FORMATO_ISO = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_BRASIL,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Hoje, em data civil de Brasília, como número de dias desde a época. Vira
// número de propósito: comparar dois inteiros não tem fuso para errar.
function diaCivilDeHoje(agora: Date = new Date()): number {
  return diaDaData(FORMATO_ISO.format(agora));
}

// "2026-08-16" (ou o ISO completo) vira o número do dia. Lido da string, sem
// passar por fuso: campo de data não tem hora, e converter para o fuso local
// joga o instante para o dia anterior.
function diaDaData(iso: string): number {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return Math.floor(Date.UTC(ano, mes - 1, dia) / 86_400_000);
}

export type UrgenciaPrazo = 'vencido' | 'critico' | 'proximo' | 'tranquilo' | 'sem-prazo';

// A régua de urgência do compliance. O cron alerta a 15 dias, então a UI usa a
// MESMA janela: o que o sistema considera "avisar" é o que a tela pinta de
// alerta. Divergir aqui faria a tela contradizer a notificação.
export function urgenciaDoPrazo(
  prazoIso: string | null,
  agora: Date = new Date(),
): UrgenciaPrazo {
  if (!prazoIso) return 'sem-prazo';

  const dias = diasAteOPrazo(prazoIso, agora);

  if (dias < 0) return 'vencido';
  if (dias <= 7) return 'critico';
  if (dias <= 15) return 'proximo';
  return 'tranquilo';
}

// `agora` é argumento para o teste poder fixar o instante sem mexer no relógio
// da máquina. Em produção ninguém passa nada.
export function diasAteOPrazo(prazoIso: string, agora: Date = new Date()): number {
  // Dois inteiros na mesma régua: dia civil de Brasília dos dois lados.
  return diaDaData(prazoIso) - diaCivilDeHoje(agora);
}

// Texto humano do prazo, já com o sinal de urgência embutido.
export function textoPrazo(prazoIso: string | null, agora: Date = new Date()): string {
  if (!prazoIso) return 'Sem prazo definido';
  const dias = diasAteOPrazo(prazoIso, agora);
  if (dias < 0) return `Vencido há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`;
  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return 'Vence amanhã';
  return `Vence em ${dias} dias`;
}

// CNPJ guardado é só dígito (a API normaliza antes de gravar, senão o mesmo
// cliente entraria duas vezes no índice único). Quem lê a tela precisa da
// máscara, e ela mora aqui, do lado do resto da formatação.
export function formatarCnpj(bruto: string | null | undefined): string {
  if (!bruto) return '';
  const d = bruto.replace(/\D/g, '');
  if (d.length !== 14) return bruto;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// Vai pondo a pontuação conforme a pessoa digita. Recalculada do zero a cada
// tecla, então apagar continua funcionando.
export function mascararCnpj(bruto: string): string {
  const d = bruto.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// Dinheiro, num lugar só.
//
// Estava escrito à mão no dashboard e na tela do projeto, e as duas cópias já
// discordavam: o dashboard escondia os centavos e a tela do projeto os
// mostrava, então o mesmo contrato aparecia como "R$ 45.000" num lugar e
// "R$ 45.000,00" no outro. É a mesma classe de duplicação que fez o card
// "Tickets abertos" discordar da lista.
//
// Centavos são opcionais porque as duas leituras são legítimas: cartão de
// dashboard existe para dar ordem de grandeza, e ficha de contrato existe para
// dar o número exato. O que não é legítimo é cada tela decidir isso sozinha.
export function formatarMoeda(
  valor: number | null | undefined,
  opcoes: { comCentavos?: boolean } = {},
): string {
  const casas = opcoes.comCentavos ? 2 : 0;
  return (valor ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

// Linha de prazo de um alerta de compliance, calculada na hora.
//
// Existe porque a mensagem gravada na notificação guarda só o FATO ("Etapa X do
// projeto Y"). A contagem de dias mora aqui de propósito: no banco ela ficava
// dentro do texto, era escrita uma vez e o índice único impedia regravar, então
// um alerta criado com "vence em 9 dias" continuava dizendo 9 uma semana
// depois. Em 09/08/2026 o dashboard anunciava 9 dias ao lado de uma data que
// faltavam 4, e a tela do projeto, que sempre calculou na hora, dizia 4.
//
// O sino e o painel do dashboard chamam esta função, e não montam o texto cada
// um do seu jeito: duas cópias da mesma regra é como as duas telas passariam a
// discordar de novo.
export function textoPrazoDoAlerta(dataReferencia: string | null): string {
  if (!dataReferencia) return 'Sem prazo definido';
  return `${textoPrazo(dataReferencia)} · ${formatarDataCivil(dataReferencia)}`;
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

// Tipo de contato na linha do tempo. A ordem aqui é a que aparece no seletor,
// e começa pelo que mais acontece no dia a dia da consultoria.
export const TIPO_INTERACAO_LABEL: Record<TipoInteracao, string> = {
  LIGACAO: 'Ligação',
  EMAIL: 'E-mail',
  WHATSAPP: 'WhatsApp',
  REUNIAO: 'Reunião',
  VISITA: 'Visita',
  OUTRO: 'Outro',
};

export const TIPOS_INTERACAO: TipoInteracao[] = [
  'LIGACAO',
  'EMAIL',
  'WHATSAPP',
  'REUNIAO',
  'VISITA',
  'OUTRO',
];

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
