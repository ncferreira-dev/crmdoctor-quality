'use client';

import { Visita } from '../../types';
import { chaveDia, diasDaGradeDoMes, DIAS_SEMANA_CURTO } from './agendaUtils';
import { VisitaChip } from './VisitaChip';

interface MonthViewProps {
  refDate: Date;
  visitasPorDia: Map<string, Visita[]>;
  onSelecionarVisita: (visita: Visita) => void;
  onSelecionarDia: (dia: Date) => void;
}

const MAX_POR_CELULA = 3;

export function MonthView({ refDate, visitasPorDia, onSelecionarVisita, onSelecionarDia }: MonthViewProps) {
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

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelecionarDia(dia)}
              className={`flex min-h-24 flex-col border-b border-r border-ink/10 p-1 text-left transition-colors hover:bg-surface ${
                doMes ? '' : 'bg-surface/50'
              }`}
            >
              <span
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  ehHoje ? 'bg-brand font-black text-white' : doMes ? 'text-ink' : 'text-ink/40'
                }`}
              >
                {dia.getDate()}
              </span>
              <div className="flex flex-col gap-0.5">
                {visitas.slice(0, MAX_POR_CELULA).map((v) => (
                  <div key={v.id} onClick={(e) => e.stopPropagation()}>
                    <VisitaChip visita={v} onClick={onSelecionarVisita} />
                  </div>
                ))}
                {visitas.length > MAX_POR_CELULA && (
                  <span className="px-1 text-[10px] text-ink/50">+{visitas.length - MAX_POR_CELULA} mais</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
