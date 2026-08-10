import { Projeto, Tarefa } from '../types';
import { diasAteOPrazo } from './formato';

// Regras de lista que estavam dentro de componente e não tinham como ser
// testadas. Moraram em `tarefas/page.tsx` e em `AgendaCalendar.tsx` até
// 10/08/2026, quando o front ganhou executor de teste (item 32 do ENTREGA.md):
// é aqui que ficam a divisão por urgência e o filtro de prazo, que são as duas
// contas que decidem o que a pessoa vê ao abrir o dia.

// A tela de tarefas responde "o que eu preciso fazer", e a resposta muda
// conforme o prazo. Por isso os grupos são por urgência, e não por status: uma
// tarefa atrasada e uma para semana que vem estão as duas "pendentes", mas não
// cobram a mesma coisa de quem abre a tela de manhã.
export interface GrupoDeTarefas {
  chave: string;
  titulo: string;
  tarefas: Tarefa[];
  destaque?: boolean;
}

export function agruparPorUrgencia(
  tarefas: Tarefa[],
  agora: Date = new Date(),
): GrupoDeTarefas[] {
  const abertas = tarefas.filter((t) => t.status !== 'CONCLUIDA');
  const concluidas = tarefas.filter((t) => t.status === 'CONCLUIDA');

  const atrasadas: Tarefa[] = [];
  const hoje: Tarefa[] = [];
  const proximas: Tarefa[] = [];
  const semPrazo: Tarefa[] = [];

  for (const tarefa of abertas) {
    if (!tarefa.prazo) {
      semPrazo.push(tarefa);
      continue;
    }
    const dias = diasAteOPrazo(tarefa.prazo, agora);
    if (dias < 0) atrasadas.push(tarefa);
    else if (dias === 0) hoje.push(tarefa);
    else proximas.push(tarefa);
  }

  return [
    { chave: 'atrasadas', titulo: 'Atrasadas', tarefas: atrasadas, destaque: true },
    { chave: 'hoje', titulo: 'Para hoje', tarefas: hoje },
    { chave: 'proximas', titulo: 'A caminho', tarefas: proximas },
    { chave: 'sem-prazo', titulo: 'Sem prazo', tarefas: semPrazo },
    { chave: 'concluidas', titulo: 'Concluídas', tarefas: concluidas },
  ].filter((grupo) => grupo.tarefas.length > 0);
}

export interface FiltrosDaAgenda {
  empresaId?: string;
  consultorId?: string;
  status?: string;
  busca?: string;
}

// Prazo de compliance por dia, já filtrado.
//
// Os filtros valem para o prazo também, senão a agenda continua mostrando
// compromisso de empresa que a pessoa acabou de tirar da tela, e o filtro passa
// a parecer quebrado. Foi medido antes: filtrando por uma empresa, as visitas
// caíam de 7 para 2 e as três marcas de prazo continuavam lá, inclusive de
// outras duas empresas.
//
// Consultor e status são filtros que um prazo não tem como responder: ninguém é
// responsável por uma data vencer, e prazo não fica "confirmado" nem
// "cancelado". Quando um deles está ativo, a pessoa pediu uma lista de visitas,
// então o prazo sai de cena em vez de fingir que se encaixa.
export function prazosPorDia(
  projetos: Projeto[],
  filtros: FiltrosDaAgenda = {},
): Map<string, Projeto[]> {
  const mapa = new Map<string, Projeto[]>();
  if (filtros.consultorId || filtros.status) return mapa;

  const termo = (filtros.busca ?? '').trim().toLowerCase();

  for (const projeto of projetos) {
    if (!projeto.dataLimiteCompliance || projeto.estagio === 'CONCLUIDO') continue;
    if (filtros.empresaId && projeto.empresaId !== filtros.empresaId) continue;
    if (termo) {
      const alvo = `${projeto.titulo} ${projeto.empresa?.nome ?? ''}`.toLowerCase();
      if (!alvo.includes(termo)) continue;
    }
    // Data civil (@db.Date): fatiar a string evita o fuso jogar o prazo para o
    // dia anterior, que é o bug que a tela já teve com esses campos.
    const chave = projeto.dataLimiteCompliance.slice(0, 10);
    mapa.set(chave, [...(mapa.get(chave) ?? []), projeto]);
  }
  return mapa;
}
