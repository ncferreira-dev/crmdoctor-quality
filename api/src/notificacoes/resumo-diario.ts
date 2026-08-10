import { MensagemEmail } from '../email/email.service';
import { diasEntre } from '../common/utils/dia-civil';

// O CONTEÚDO do aviso diário, separado de quem manda e de quem busca no banco.
//
// Está num arquivo só de funções puras de propósito: é a parte que decide o que
// uma pessoa vai ler de manhã, e é a única parte que dá para provar sem banco,
// sem rede e sem relógio. O serviço faz a consulta e chama o motor; a régua de
// "o que é urgente" mora aqui.

export interface AlertaDoResumo {
  mensagem: string;
  dataReferencia: Date | null;
  criadoEm: Date;
}

// Chamado sem primeira resposta e fora do prazo (item 4). Não é uma
// `Notificacao`: o SLA é um estado que dura até alguém responder, e não um fato
// datado com baixa por pessoa. Ver o comentário em
// `acrescentarTicketsSemResposta`.
export interface TicketSemResposta {
  titulo: string;
  empresa: string;
  prioridade: number;
  abertoEm: Date;
  prazoLimite: Date;
}

export interface SecoesDoResumo {
  venceu: AlertaDoResumo[];
  venceEmBreve: AlertaDoResumo[];
  desdeOntem: AlertaDoResumo[];
  ticketsSemResposta: TicketSemResposta[];
}

// As três seções são MUTUAMENTE EXCLUSIVAS, e essa é a decisão que mais importa
// neste arquivo. Um alerta que aparecesse em duas seções ensinaria a pessoa a
// ler o e-mail na diagonal, que é exatamente o ruído que o item 3 do
// ENTREGA.md existe para não criar.
//
//   Venceu        -> o prazo já passou. Vem primeiro sempre, independente de
//                    quando o alerta nasceu: prazo estourado é o assunto do dia.
//   Vence         -> o prazo ainda não chegou e o alerta nasceu HOJE. É a
//                    novidade da manhã.
//   Desde ontem   -> o prazo ainda não chegou e o alerta já existia ontem, sem
//                    baixa. É a pilha que não anda, e ela merece seção própria
//                    justamente por não ser novidade.
export function separarEmSecoes(
  alertas: AlertaDoResumo[],
  hoje: Date,
): SecoesDoResumo {
  const secoes: SecoesDoResumo = {
    venceu: [],
    venceEmBreve: [],
    desdeOntem: [],
    // Preenchida pelo serviço, que é quem conhece os chamados. Fica aqui para o
    // e-mail continuar sendo montado por um lugar só.
    ticketsSemResposta: [],
  };

  for (const alerta of alertas) {
    // Sem data de referência não há prazo para cobrar, e o alerta não entra em
    // nenhuma seção: o aviso diário é sobre prazo, e listar o que não tem prazo
    // aqui só faria o e-mail crescer sem dizer nada.
    if (!alerta.dataReferencia) continue;

    if (alerta.dataReferencia.getTime() < hoje.getTime()) {
      secoes.venceu.push(alerta);
    } else if (alerta.criadoEm.getTime() < hoje.getTime()) {
      secoes.desdeOntem.push(alerta);
    } else {
      secoes.venceEmBreve.push(alerta);
    }
  }

  const porPrazo = (a: AlertaDoResumo, b: AlertaDoResumo) =>
    (a.dataReferencia?.getTime() ?? 0) - (b.dataReferencia?.getTime() ?? 0);
  secoes.venceu.sort(porPrazo);
  secoes.venceEmBreve.sort(porPrazo);
  secoes.desdeOntem.sort(porPrazo);

  return secoes;
}

export function totalDeAlertas(secoes: SecoesDoResumo): number {
  return (
    secoes.venceu.length +
    secoes.venceEmBreve.length +
    secoes.desdeOntem.length +
    secoes.ticketsSemResposta.length
  );
}

// A contagem de dias é feita AGORA, na hora de montar o e-mail, e nunca lida do
// banco. O texto gravado na notificação guarda só o fato, porque o índice único
// impede regravar e um "vence em 9 dias" escrito uma vez continuaria dizendo 9
// uma semana depois. É a mesma regra que a tela segue.
function linhaDoPrazo(alerta: AlertaDoResumo, hoje: Date): string {
  if (!alerta.dataReferencia) return 'sem prazo definido';

  const dias = diasEntre(hoje, alerta.dataReferencia);
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  if (dias > 1) return `vence em ${dias} dias`;
  if (dias === -1) return 'venceu ontem';
  return `venceu há ${Math.abs(dias)} dias`;
}

function assuntoDo(secoes: SecoesDoResumo): string {
  const vencidos = secoes.venceu.length;
  const aVencer = secoes.venceEmBreve.length + secoes.desdeOntem.length;
  const chamados = secoes.ticketsSemResposta.length;

  // O assunto diz o número antes de a pessoa abrir, e põe o vencido na frente.
  // Assunto igual todo dia vira assunto que ninguém lê.
  const partes: string[] = [];
  if (vencidos > 0) partes.push(`${vencidos} prazo(s) vencido(s)`);
  if (aVencer > 0) partes.push(`${aVencer} a vencer`);
  if (chamados > 0) partes.push(`${chamados} chamado(s) sem resposta`);

  return `Compliance: ${partes.join(' e ')}`;
}

type SecaoDePrazo = 'venceu' | 'venceEmBreve' | 'desdeOntem';

const TITULOS: Record<SecaoDePrazo, string> = {
  venceu: 'Já venceu',
  venceEmBreve: 'Vence',
  desdeOntem: 'Em aberto desde ontem',
};

const ORDEM: SecaoDePrazo[] = ['venceu', 'venceEmBreve', 'desdeOntem'];

// Quantas horas o chamado tem para a primeira resposta, por prioridade. É a
// mesma régua de `tickets.constants.ts`, e aqui só serve para o e-mail dizer
// qual prazo foi estourado.
const NOME_DA_PRIORIDADE: Record<number, string> = {
  1: 'alta',
  2: 'média',
  3: 'baixa',
};

function horasDeAtraso(prazoLimite: Date, agora: Date): number {
  return Math.floor(
    (agora.getTime() - prazoLimite.getTime()) / (60 * 60 * 1000),
  );
}

/**
 * Monta o e-mail de uma pessoa. Só é chamado quando ela tem algo: quem não tem
 * nada não recebe e-mail, e é o serviço que decide isso.
 */
export function montarResumo(
  nome: string,
  secoes: SecoesDoResumo,
  hoje: Date,
  // `hoje` é a meia-noite do dia civil, que é a régua dos prazos de compliance.
  // O SLA de chamado é contado em HORAS, então ele precisa do instante, e não
  // do dia. Duas réguas porque são duas unidades, e misturá-las é como o
  // sistema já errou um dia inteiro antes.
  agora: Date = new Date(),
): MensagemEmail {
  const linhasTexto: string[] = [`Bom dia, ${nome}.`, ''];
  const partesHtml: string[] = [
    `<p style="font-size:15px">Bom dia, ${escapar(nome)}.</p>`,
  ];

  // Uma seção do e-mail: título com a contagem, e uma linha por item. Existe
  // como função para as quatro seções saírem iguais, inclusive a de chamados,
  // que veio depois.
  const escreverSecao = (
    titulo: string,
    itens: { principal: string; detalhe: string }[],
  ) => {
    if (itens.length === 0) return;

    linhasTexto.push(`${titulo.toUpperCase()} (${itens.length})`);
    partesHtml.push(
      `<h2 style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6E1C24;margin:24px 0 8px">` +
        `${escapar(titulo)} (${itens.length})</h2>`,
      '<ul style="margin:0;padding-left:18px">',
    );

    for (const item of itens) {
      linhasTexto.push(`  - ${item.principal} (${item.detalhe})`);
      partesHtml.push(
        `<li style="margin:4px 0">${escapar(item.principal)} ` +
          `<span style="color:#767676">(${escapar(item.detalhe)})</span></li>`,
      );
    }

    linhasTexto.push('');
    partesHtml.push('</ul>');
  };

  for (const chave of ORDEM) {
    escreverSecao(
      TITULOS[chave],
      secoes[chave].map((alerta) => ({
        principal: alerta.mensagem,
        detalhe: linhaDoPrazo(alerta, hoje),
      })),
    );
  }

  // A quarta seção, do item 4. Vem por último de propósito: prazo de compliance
  // é obrigação com data marcada, chamado sem resposta é obrigação de hoje.
  escreverSecao(
    'Chamados sem primeira resposta',
    secoes.ticketsSemResposta.map((ticket) => ({
      principal: `${ticket.titulo}, da empresa ${ticket.empresa}`,
      detalhe:
        `prioridade ${NOME_DA_PRIORIDADE[ticket.prioridade] ?? ticket.prioridade}, ` +
        `${horasDeAtraso(ticket.prazoLimite, agora)}h além do prazo`,
    })),
  );

  const rodape =
    'Você recebeu este aviso porque é responsável pelo marco, está na equipe do projeto ou registrou o chamado.';
  linhasTexto.push(rodape);
  partesHtml.push(
    `<p style="font-size:12px;color:#767676;margin-top:24px">${escapar(rodape)}</p>`,
  );

  return {
    para: '',
    assunto: assuntoDo(secoes),
    texto: linhasTexto.join('\n'),
    html: partesHtml.join(''),
  };
}

// Nome de projeto e de empresa vêm do banco, digitados por gente, e vão para
// dentro de HTML. Sem escapar, um nome com `<` quebraria a mensagem, e um com
// tag dentro viraria marcação de verdade na caixa de entrada de todo mundo.
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
