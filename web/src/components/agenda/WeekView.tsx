'use client';

import { Projeto, Tarefa, Visita } from '../../types';
import { chaveDia, diasDaSemana, DIAS_SEMANA_CURTO } from './agendaUtils';
import { VisitaChip } from './VisitaChip';
import { TarefaChip } from './TarefaChip';
import { PrazoChip } from './PrazoChip';

interface WeekViewProps {
  refDate: Date;
  visitasPorDia: Map<string, Visita[]>;
  // Tarefa e prazo entraram aqui em 12/08/2026. Antes só a visão de Mês os
  // mostrava, e trocar de Mês para Semana fazia a maior parte do trabalho da
  // equipe sumir da tela: quem olhasse a semana veria uma agenda quase vazia e
  // concluiria que não havia nada para fazer.
  tarefasPorDia: Map<string, Tarefa[]>;
  prazosPorDia: Map<string, Projeto[]>;
  onSelecionarVisita: (visita: Visita) => void;
  onSelecionarTarefa: (tarefa: Tarefa) => void;
  onSelecionarDia: (dia: Date) => void;
}

// Semana como 7 colunas (dias), cada uma listando as visitas daquele dia por
// horário — mostra "a operação de cada dia da semana" sem uma grade de 24h.
export function WeekView({
  refDate,
  visitasPorDia,
  tarefasPorDia,
  prazosPorDia,
  onSelecionarVisita,
  onSelecionarTarefa,
  onSelecionarDia,
}: WeekViewProps) {
  const dias = diasDaSemana(refDate);
  const hoje = chaveDia(new Date());

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {dias.map((dia) => {
        const chave = chaveDia(dia);
        const ehHoje = chave === hoje;
        const visitas = visitasPorDia.get(chave) ?? [];
        const tarefas = tarefasPorDia.get(chave) ?? [];
        const prazos = prazosPorDia.get(chave) ?? [];
        const vazio = visitas.length + tarefas.length + prazos.length === 0;

        return (
          <div key={chave} className="flex min-h-40 flex-col rounded-card border border-ink/10 bg-white p-2 shadow-card">
            <button
              type="button"
              onClick={() => onSelecionarDia(dia)}
              className="mb-2 text-left"
            >
              <span className="block text-xs font-light uppercase tracking-wide text-ink/60">
                {DIAS_SEMANA_CURTO[dia.getDay()]}
              </span>
              <span className={`text-lg font-black leading-none ${ehHoje ? 'text-brand' : 'text-ink'}`}>
                {dia.getDate()}
              </span>
            </button>
            <div className="flex flex-1 flex-col gap-1">
              {/* "Livre" só quando não há NADA no dia. Enquanto a coluna
                  contava apenas visita, um dia com três entregas para fazer
                  aparecia escrito "Livre". */}
              {vazio ? (
                <span className="text-[11px] text-ink/30">Livre</span>
              ) : (
                <>
                  {visitas.map((v) => (
                    <VisitaChip key={v.id} visita={v} variante="detalhado" onClick={onSelecionarVisita} />
                  ))}
                  {tarefas.map((tarefa) => (
                    <TarefaChip key={tarefa.id} tarefa={tarefa} onClick={onSelecionarTarefa} />
                  ))}
                  {/* Prazo por último e colado no rodapé da coluna, como no
                      mês: é a data que fecha o dia, não mais um compromisso no
                      meio da fila. */}
                  {prazos.length > 0 && (
                    <div className="mt-auto flex flex-col gap-0.5 pt-1">
                      {prazos.map((projeto) => (
                        <PrazoChip key={projeto.id} projeto={projeto} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
