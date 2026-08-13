import { Visita } from '../../types';

// Chave de dia YYYY-MM-DD no fuso local do navegador (America/Sao_Paulo para o
// usuário). Usada pra agrupar visitas por dia no calendário.
export function chaveDia(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function horaMinuto(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Agrupa visitas por dia (chave local), cada grupo ordenado por horário.
export function agruparPorDia(visitas: Visita[]): Map<string, Visita[]> {
  const mapa = new Map<string, Visita[]>();
  for (const visita of visitas) {
    const chave = chaveDia(new Date(visita.inicio));
    const grupo = mapa.get(chave) ?? [];
    grupo.push(visita);
    mapa.set(chave, grupo);
  }
  for (const grupo of mapa.values()) {
    grupo.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  }
  return mapa;
}

// Os 42 dias da grade do mês (6 semanas), começando no domingo anterior ao dia 1.
export function diasDaGradeDoMes(refDate: Date): Date[] {
  const primeiro = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const inicio = new Date(primeiro);
  inicio.setDate(inicio.getDate() - inicio.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });
}

// Os 7 dias da semana que contém refDate (domingo a sábado).
export function diasDaSemana(refDate: Date): Date[] {
  const inicio = new Date(refDate);
  inicio.setDate(refDate.getDate() - refDate.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });
}

// Quanto a visão de Lista enxerga à frente. Uma constante só, porque a janela
// aparece em dois lugares: o pedido das visitas ao backend e o recorte de
// tarefa e prazo, que já vêm carregados sem limite de data. Dois números
// separados fariam a lista mostrar uma tarefa de dezembro e nenhuma visita ao
// lado dela.
const DIAS_DA_LISTA = 90;

// A janela da Lista em chave de dia (YYYY-MM-DD), para comparar com as chaves
// dos mapas por dia sem passar por fuso: comparar string nesse formato dá a
// mesma ordem que comparar data.
export function janelaDaLista(refDate: Date): { de: string; ate: string } {
  const fim = new Date(refDate);
  fim.setDate(fim.getDate() + DIAS_DA_LISTA);
  return { de: chaveDia(refDate), ate: chaveDia(fim) };
}

// Os dias que têm alguma coisa, em ordem, dentro da janela.
//
// Existe porque a Lista passou a juntar três fontes (visita, tarefa e prazo) e
// cada uma chega num mapa próprio. Sem a janela, tarefa e prazo entrariam
// inteiros: eles são carregados uma vez, sem recorte de data, e a lista
// mostraria entrega do ano passado junto com a visita da semana que vem.
export function diasComCompromisso(
  mapas: Map<string, unknown[]>[],
  janela: { de: string; ate: string },
): string[] {
  const dias = new Set<string>();
  for (const mapa of mapas) {
    for (const [chave, itens] of mapa) {
      if (itens.length === 0) continue;
      if (chave < janela.de || chave > janela.ate) continue;
      dias.add(chave);
    }
  }
  return [...dias].sort();
}

// Intervalo [de, ate] em ISO que cobre a visão atual — usado pra buscar as
// visitas do backend (GET /visitas?de=&ate=).
export function intervaloDaVisao(
  view: 'mes' | 'semana' | 'dia' | 'lista',
  refDate: Date,
): { de: string; ate: string } {
  let inicio: Date;
  let fim: Date;

  if (view === 'mes') {
    const dias = diasDaGradeDoMes(refDate);
    inicio = dias[0];
    fim = dias[dias.length - 1];
  } else if (view === 'semana') {
    const dias = diasDaSemana(refDate);
    inicio = dias[0];
    fim = dias[dias.length - 1];
  } else if (view === 'dia') {
    inicio = new Date(refDate);
    fim = new Date(refDate);
  } else {
    inicio = new Date(refDate);
    fim = new Date(refDate);
    fim.setDate(fim.getDate() + DIAS_DA_LISTA);
  }

  inicio.setHours(0, 0, 0, 0);
  fim.setHours(23, 59, 59, 999);
  return { de: inicio.toISOString(), ate: fim.toISOString() };
}

export const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

// "5 de agosto de 2026", para rótulo de leitor de tela. Montado na mão em vez
// de toLocaleDateString porque o texto é gerado no servidor e no navegador: se
// os dois tiverem locales diferentes, o React acusa erro de hidratação.
export function dataPorExtenso(data: Date): string {
  return `${data.getDate()} de ${MESES[data.getMonth()]} de ${data.getFullYear()}`;
}
