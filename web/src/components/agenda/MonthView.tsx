'use client';

import { Projeto, Tarefa, Visita } from '../../types';
import { chaveDia, dataPorExtenso, diasDaGradeDoMes, DIAS_SEMANA_CURTO } from './agendaUtils';
import { VisitaChip } from './VisitaChip';
import { TarefaChip } from './TarefaChip';
import { PrazoChip } from './PrazoChip';

interface MonthViewProps {
  refDate: Date;
  visitasPorDia: Map<string, Visita[]>;
  // Prazo de compliance que cai no dia. Chave no mesmo formato de chaveDia.
  prazosPorDia: Map<string, Projeto[]>;
  // Tarefa com prazo naquele dia. Terceira coisa que a agenda mostra, e por
  // isso terceiro desenho: visita é hora marcada, prazo é data que chega
  // sozinha, tarefa é trabalho que alguém precisa fazer até ali.
  tarefasPorDia: Map<string, Tarefa[]>;
  onSelecionarVisita: (visita: Visita) => void;
  // A marca de tarefa é curta e o título quase sempre não cabe. Sem um jeito de
  // abrir, a pessoa via "Revisar procedimento d..." e não tinha como saber o
  // que era sem sair da agenda. O prazo já era clicável (vai para o projeto);
  // a tarefa não era clicável nada.
  onSelecionarTarefa: (tarefa: Tarefa) => void;
  onSelecionarDia: (dia: Date) => void;
}

const MAX_POR_CELULA = 3;

export function MonthView({
  refDate,
  visitasPorDia,
  prazosPorDia,
  tarefasPorDia,
  onSelecionarVisita,
  onSelecionarTarefa,
  onSelecionarDia,
}: MonthViewProps) {
  const dias = diasDaGradeDoMes(refDate);
  const hoje = chaveDia(new Date());

  return (
    <div className="overflow-hidden rounded-card border border-ink/10 bg-white shadow-card">
      <div className="grid grid-cols-7 border-b border-ink/10">
        {DIAS_SEMANA_CURTO.map((dia) => (
          <div key={dia} className="p-2 text-center text-xs font-light uppercase tracking-wide text-ink/60">
            {dia}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((dia, i) => {
          const chave = chaveDia(dia);
          const doMes = dia.getMonth() === refDate.getMonth();
          const ehHoje = chave === hoje;
          const visitas = visitasPorDia.get(chave) ?? [];
          const prazos = prazosPorDia.get(chave) ?? [];
          const tarefas = tarefasPorDia.get(chave) ?? [];

          return (
            // A célula é um div, e não um button, porque os chips de visita
            // dentro dela também são botões: botão dentro de botão é HTML
            // inválido e o React acusa erro de hidratação. Quem recebe o
            // clique de "agendar neste dia" é a camada de fundo abaixo, que
            // cobre a célula inteira e fica atrás dos chips.
            <div
              key={i}
              className={`relative flex min-h-24 flex-col border-b border-r border-ink/10 p-1 ${
                doMes ? '' : 'bg-surface/50'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelecionarDia(dia)}
                aria-label={`Agendar visita em ${dataPorExtenso(dia)}`}
                className="absolute inset-0 transition-colors hover:bg-surface focus-visible:bg-surface"
              />
              <span
                className={`relative mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  ehHoje ? 'bg-brand font-black text-white' : doMes ? 'text-ink' : 'text-ink/40'
                }`}
              >
                {dia.getDate()}
              </span>
              <div className="relative flex flex-col gap-0.5">
                {visitas.slice(0, MAX_POR_CELULA).map((v) => (
                  <VisitaChip key={v.id} visita={v} onClick={onSelecionarVisita} />
                ))}
                {visitas.length > MAX_POR_CELULA && (
                  <span className="px-1 text-[10px] text-ink/50">+{visitas.length - MAX_POR_CELULA} mais</span>
                )}
              </div>

              {/* Tarefa com prazo no dia. Some quando concluída: agenda que
                  mostra o que já foi feito vira ruído. */}
              {tarefas.length > 0 && (
                <div className="relative flex flex-col gap-0.5 pt-0.5">
                  {tarefas.slice(0, 2).map((tarefa) => (
                    <TarefaChip key={tarefa.id} tarefa={tarefa} onClick={onSelecionarTarefa} />
                  ))}
                  {/* O "+N" também abre: era o único jeito de saber que existia
                      mais alguma coisa naquele dia, e não dizia o que era. */}
                  {tarefas.length > 2 && (
                    <button
                      type="button"
                      onClick={() => onSelecionarTarefa(tarefas[2])}
                      className="px-1 text-left text-[10px] text-ink/50 transition-colors hover:text-ink"
                    >
                      +{tarefas.length - 2} tarefa(s)
                    </button>
                  )}
                </div>
              )}

              {prazos.length > 0 && (
                <div className="relative mt-auto flex flex-col gap-0.5 pt-1">
                  {prazos.map((projeto) => (
                    <PrazoChip key={projeto.id} projeto={projeto} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
