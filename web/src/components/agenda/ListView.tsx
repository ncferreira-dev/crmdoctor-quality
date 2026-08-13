'use client';

import { Projeto, Tarefa, Visita } from '../../types';
import { STATUS_VISITA_LABEL, formatarData } from '../../lib/formato';
import { diasComCompromisso, horaMinuto, janelaDaLista } from './agendaUtils';
import { Badge } from '../ui/Badge';
import { TarefaChip } from './TarefaChip';
import { PrazoChip } from './PrazoChip';

interface ListViewProps {
  refDate: Date;
  visitasPorDia: Map<string, Visita[]>;
  // Tarefa e prazo entraram aqui em 12/08/2026. A Lista se chamava "Próximas
  // visitas" e era a visão de quem quer saber o que vem pela frente: mostrar só
  // visita fazia a resposta ser sempre menor que a verdade.
  tarefasPorDia: Map<string, Tarefa[]>;
  prazosPorDia: Map<string, Projeto[]>;
  onSelecionarVisita: (visita: Visita) => void;
  onSelecionarTarefa: (tarefa: Tarefa) => void;
}

export function ListView({
  refDate,
  visitasPorDia,
  tarefasPorDia,
  prazosPorDia,
  onSelecionarVisita,
  onSelecionarTarefa,
}: ListViewProps) {
  const janela = janelaDaLista(refDate);
  const dias = diasComCompromisso(
    [visitasPorDia, tarefasPorDia, prazosPorDia],
    janela,
  );

  if (dias.length === 0) {
    return (
      <div className="rounded-card border border-ink/10 bg-white p-8 text-center shadow-card">
        <p className="text-sm text-ink/40">Nada marcado para os próximos meses.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {dias.map((chave) => {
        const visitas = visitasPorDia.get(chave) ?? [];
        const tarefas = tarefasPorDia.get(chave) ?? [];
        const prazos = prazosPorDia.get(chave) ?? [];

        return (
          <div key={chave}>
            <h3 className="mb-2 text-xs font-light uppercase tracking-wide text-ink/60">
              {/* A data sai da chave do dia, e não da primeira visita: agora um
                  dia pode ter só tarefa ou só prazo, e aí não existe visita de
                  onde tirar a data. O T12:00 evita o fuso empurrar o rótulo
                  para a véspera. */}
              {formatarData(`${chave}T12:00:00.000Z`)}
            </h3>
            <div className="flex flex-col gap-2">
              {visitas.map((visita) => (
                <button
                  key={visita.id}
                  type="button"
                  onClick={() => onSelecionarVisita(visita)}
                  className="flex items-center gap-4 rounded-card border border-ink/10 bg-white p-3 text-left shadow-card transition-colors hover:border-brand/40"
                >
                  <span className="w-16 shrink-0 font-black leading-none text-ink">{horaMinuto(visita.inicio)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black leading-none text-ink">{visita.empresa?.nome ?? 'Empresa'}</p>
                    <p className="mt-1 truncate text-xs text-ink/60">
                      {visita.tipoServico}
                      {visita.consultor ? ` · ${visita.consultor.nome}` : ''}
                    </p>
                  </div>
                  <Badge tom={visita.status === 'CANCELADA' ? 'alerta' : 'neutral'}>
                    {STATUS_VISITA_LABEL[visita.status]}
                  </Badge>
                </button>
              ))}
              {tarefas.map((tarefa) => (
                <TarefaChip
                  key={tarefa.id}
                  tarefa={tarefa}
                  variante="detalhado"
                  onClick={onSelecionarTarefa}
                />
              ))}
              {prazos.map((projeto) => (
                <PrazoChip key={projeto.id} projeto={projeto} variante="detalhado" />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
