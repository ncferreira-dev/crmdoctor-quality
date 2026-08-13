'use client';

import { Projeto, Tarefa, Visita } from '../../types';
import { STATUS_VISITA_LABEL } from '../../lib/formato';
import { chaveDia, horaMinuto } from './agendaUtils';
import { Badge } from '../ui/Badge';
import { TarefaChip } from './TarefaChip';
import { PrazoChip } from './PrazoChip';

interface DayViewProps {
  refDate: Date;
  visitasPorDia: Map<string, Visita[]>;
  // Tarefa e prazo entraram aqui em 12/08/2026, pelo mesmo motivo da Semana:
  // a visão de Dia respondia "quem eu visito hoje" e era lida como "o que eu
  // tenho hoje", que é outra pergunta e tinha outra resposta.
  tarefasPorDia: Map<string, Tarefa[]>;
  prazosPorDia: Map<string, Projeto[]>;
  onSelecionarVisita: (visita: Visita) => void;
  onSelecionarTarefa: (tarefa: Tarefa) => void;
}

export function DayView({
  refDate,
  visitasPorDia,
  tarefasPorDia,
  prazosPorDia,
  onSelecionarVisita,
  onSelecionarTarefa,
}: DayViewProps) {
  const chave = chaveDia(refDate);
  const visitas = visitasPorDia.get(chave) ?? [];
  const tarefas = tarefasPorDia.get(chave) ?? [];
  const prazos = prazosPorDia.get(chave) ?? [];

  if (visitas.length + tarefas.length + prazos.length === 0) {
    return (
      <div className="rounded-card border border-ink/10 bg-white p-8 text-center shadow-card">
        <p className="text-sm text-ink/40">Nada marcado para este dia.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {visitas.map((visita) => (
        <button
          key={visita.id}
          type="button"
          onClick={() => onSelecionarVisita(visita)}
          className="flex items-start gap-4 rounded-card border border-ink/10 bg-white p-4 text-left shadow-card transition-colors hover:border-brand/40"
        >
          <div className="w-24 shrink-0">
            <span className="block font-black leading-none text-ink">{horaMinuto(visita.inicio)}</span>
            <span className="block text-xs text-ink/50">até {horaMinuto(visita.fim)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black leading-none text-ink">{visita.empresa?.nome ?? 'Empresa'}</p>
            <p className="mt-1 text-xs text-ink/60">
              {visita.tipoServico}
              {visita.consultor ? ` · ${visita.consultor.nome}` : ''}
            </p>
          </div>
          <Badge tom={visita.status === 'CANCELADA' ? 'alerta' : 'neutral'}>
            {STATUS_VISITA_LABEL[visita.status]}
          </Badge>
        </button>
      ))}

      {/* Depois das visitas, e não misturado entre elas: a visita tem hora e
          fica em ordem cronológica; tarefa e prazo têm só o dia, e enfiá-los no
          meio da fila inventaria um horário que ninguém marcou. */}
      {tarefas.map((tarefa) => (
        <TarefaChip key={tarefa.id} tarefa={tarefa} variante="detalhado" onClick={onSelecionarTarefa} />
      ))}
      {prazos.map((projeto) => (
        <PrazoChip key={projeto.id} projeto={projeto} variante="detalhado" />
      ))}
    </div>
  );
}
